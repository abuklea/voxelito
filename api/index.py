import os
import json
import logging
import sys
import math
from typing import List, Literal, Optional, Union, Dict
from dotenv import load_dotenv
import nest_asyncio
from fastapi.concurrency import run_in_threadpool

nest_asyncio.apply()

# Configure logging
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("openai").setLevel(logging.INFO)

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

# Load environment variables
load_dotenv(dotenv_path='api/.env.local')

# --- Pydantic Models for LLM ---

class Box(BaseModel):
    type: Literal['box'] = 'box'
    start: List[int] = Field(description="[x, y, z] coordinate of the starting corner")
    size: List[int] = Field(description="[width, height, depth] of the box")
    material: str

class Sphere(BaseModel):
    type: Literal['sphere'] = 'sphere'
    center: List[int] = Field(description="[x, y, z] center of the sphere")
    radius: float
    material: str

class Pyramid(BaseModel):
    type: Literal['pyramid'] = 'pyramid'
    base_center: List[int] = Field(description="[x, y, z] center of the square base")
    height: int
    material: str

class SceneDescription(BaseModel):
    shapes: List[Union[Box, Sphere, Pyramid]] = Field(description="List of shapes composing the scene")

class AgentResponse(BaseModel):
    commentary: str = Field(description="Conversational response to the user, explaining what you are doing, asking for clarification, or providing progress updates.")
    scene: Optional[SceneDescription] = Field(description="The 3D scene generation data, if a scene is being generated or modified.")

# --- API Models ---
# We don't use these for LLM generation anymore, but for API response structure
class ChunkResponse(BaseModel):
    position: List[int]
    rle_data: str
    palette: List[str]

# --- Constants ---
CHUNK_SIZE = 32
PALETTE = [
  "air", "grass", "stone", "dirt", "water", "wood", "leaves", "sand",
  "brick", "roof", "glass", "plank", "concrete", "asphalt", "road_white",
  "road_yellow", "neon_blue", "neon_pink", "metal", "snow", "lava"
]
PALETTE_MAP = {name: i for i, name in enumerate(PALETTE)}
PALETTE_DESCRIPTIONS = {
    "air": "Empty space (use to clear areas)",
    "grass": "Green grassy terrain, good for ground",
    "stone": "Gray natural stone",
    "dirt": "Brown soil",
    "water": "Blue water liquid",
    "wood": "Brown wood log",
    "leaves": "Green leaves for trees",
    "sand": "Yellow sand",
    "brick": "Red brick wall",
    "roof": "Dark brown roofing for houses",
    "glass": "Transparent glass",
    "plank": "Light wood planks for floors/buildings",
    "concrete": "Gray concrete",
    "asphalt": "Dark gray asphalt for roads",
    "road_white": "Asphalt with white line for road markings",
    "road_yellow": "Asphalt with yellow line for road markings",
    "neon_blue": "Glowing cyan/blue light",
    "neon_pink": "Glowing pink light",
    "metal": "Shiny metal surface",
    "snow": "White snow",
    "lava": "Glowing orange lava"
}
MIN_COORD = -512
MAX_COORD = 512

# --- Rasterization Logic ---

class VoxelGrid:
    def __init__(self):
        # Map (cx, cy, cz) -> flat_array (size 32*32*32)
        # We use a dict of lists for sparse chunk storage
        self.chunks: Dict[tuple, List[int]] = {}

    def get_chunk(self, cx, cy, cz):
        key = (cx, cy, cz)
        if key not in self.chunks:
            # Initialize with 0 (air)
            self.chunks[key] = [0] * (CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE)
        return self.chunks[key]

    def fill_chunk(self, cx, cy, cz, material_idx):
        # Set entire chunk to material
        self.chunks[(cx, cy, cz)] = [material_idx] * (CHUNK_SIZE ** 3)

    def set_voxel(self, x, y, z, material_idx):
        # Bounds check
        if not (MIN_COORD <= x < MAX_COORD and MIN_COORD <= y < MAX_COORD and MIN_COORD <= z < MAX_COORD):
            return

        cx, rx = divmod(x, CHUNK_SIZE)
        cy, ry = divmod(y, CHUNK_SIZE)
        cz, rz = divmod(z, CHUNK_SIZE)

        chunk = self.get_chunk(cx, cy, cz)
        index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
        if 0 <= index < len(chunk):
            chunk[index] = material_idx

def clamp(val):
    return max(MIN_COORD, min(val, MAX_COORD))

def rasterize_scene(scene_desc: SceneDescription) -> List[ChunkResponse]:
    logger.info(f"Rasterizing {len(scene_desc.shapes)} shapes")
    grid = VoxelGrid()

    for i, shape in enumerate(scene_desc.shapes):
        logger.info(f"Processing shape {i}: {shape}")
        mat_idx = PALETTE_MAP.get(shape.material, 1)

        if isinstance(shape, Box):
            logger.info(f"Box raw: {shape.start} {shape.size}")
            sx = clamp(shape.start[0])
            sy = clamp(shape.start[1])
            sz = clamp(shape.start[2])

            ex = clamp(shape.start[0] + shape.size[0])
            ey = clamp(shape.start[1] + shape.size[1])
            ez = clamp(shape.start[2] + shape.size[2])

            logger.info(f"Clamped bounds: {sx}-{ex}, {sy}-{ey}, {sz}-{ez}")

            # Width/Height/Depth might be 0 if clamped out
            if sx >= ex or sy >= ey or sz >= ez: continue

            w, h, d = ex - sx, ey - sy, ez - sz

            # Chunk ranges
            min_cx, min_rx = divmod(sx, CHUNK_SIZE)
            min_cy, min_ry = divmod(sy, CHUNK_SIZE)
            min_cz, min_rz = divmod(sz, CHUNK_SIZE)

            # Calculate max chunks (inclusive for loop)
            max_cx = (ex - 1) // CHUNK_SIZE
            max_cy = (ey - 1) // CHUNK_SIZE
            max_cz = (ez - 1) // CHUNK_SIZE

            logger.info(f"Chunk loop: X {min_cx}-{max_cx}")

            for cx in range(min_cx, max_cx + 1):
                for cy in range(min_cy, max_cy + 1):
                    for cz in range(min_cz, max_cz + 1):
                        # Chunk bounds
                        csx = cx * CHUNK_SIZE
                        csy = cy * CHUNK_SIZE
                        csz = cz * CHUNK_SIZE
                        cex = csx + CHUNK_SIZE
                        cey = csy + CHUNK_SIZE
                        cez = csz + CHUNK_SIZE

                        isx = max(sx, csx)
                        isy = max(sy, csy)
                        isz = max(sz, csz)
                        iex = min(ex, cex)
                        iey = min(ey, cey)
                        iez = min(ez, cez)

                        if isx >= iex or isy >= iey or isz >= iez:
                            continue

                        # Check if fully contained
                        if isx == csx and iex == cex and \
                           isy == csy and iey == cey and \
                           isz == csz and iez == cez:
                            grid.fill_chunk(cx, cy, cz, mat_idx)
                        else:
                            # Iterate intersection
                            chunk = grid.get_chunk(cx, cy, cz)
                            # Optimization: Local coordinates
                            lx_start = isx - csx
                            lx_end = iex - csx
                            ly_start = isy - csy
                            ly_end = iey - csy
                            lz_start = isz - csz
                            lz_end = iez - csz

                            # Loop
                            for z in range(lz_start, lz_end):
                                z_offset = z * CHUNK_SIZE * CHUNK_SIZE
                                for y in range(ly_start, ly_end):
                                    y_offset = y * CHUNK_SIZE
                                    base = z_offset + y_offset
                                    for x in range(lx_start, lx_end):
                                        chunk[base + x] = mat_idx

        elif isinstance(shape, Sphere):
            cx, cy, cz = shape.center
            r = shape.radius
            r_sq = r * r

            min_x = clamp(int(cx - r))
            max_x = clamp(int(cx + r))
            min_y = clamp(int(cy - r))
            max_y = clamp(int(cy + r))
            min_z = clamp(int(cz - r))
            max_z = clamp(int(cz + r))

            if min_x >= max_x or min_y >= max_y or min_z >= max_z: continue

            min_cx = min_x // CHUNK_SIZE
            max_cx = max_x // CHUNK_SIZE
            min_cy = min_y // CHUNK_SIZE
            max_cy = max_y // CHUNK_SIZE
            min_cz = min_z // CHUNK_SIZE
            max_cz = max_z // CHUNK_SIZE

            for chx in range(min_cx, max_cx + 1):
                 for chy in range(min_cy, max_cy + 1):
                     for chz in range(min_cz, max_cz + 1):
                         # Chunk bounds
                         c_min_x = chx * CHUNK_SIZE
                         c_max_x = c_min_x + CHUNK_SIZE - 1
                         c_min_y = chy * CHUNK_SIZE
                         c_max_y = c_min_y + CHUNK_SIZE - 1
                         c_min_z = chz * CHUNK_SIZE
                         c_max_z = c_min_z + CHUNK_SIZE - 1

                         # 1. Check if fully outside (AABB vs Sphere)
                         closest_x = max(c_min_x, min(cx, c_max_x))
                         closest_y = max(c_min_y, min(cy, c_max_y))
                         closest_z = max(c_min_z, min(cz, c_max_z))
                         dist_closest_sq = (closest_x - cx)**2 + (closest_y - cy)**2 + (closest_z - cz)**2

                         if dist_closest_sq > r_sq:
                             continue

                         # 2. Check if fully inside (All corners inside)
                         corners = [
                             (c_min_x, c_min_y, c_min_z), (c_max_x, c_min_y, c_min_z),
                             (c_min_x, c_max_y, c_min_z), (c_max_x, c_max_y, c_min_z),
                             (c_min_x, c_min_y, c_max_z), (c_max_x, c_min_y, c_max_z),
                             (c_min_x, c_max_y, c_max_z), (c_max_x, c_max_y, c_max_z)
                         ]
                         all_inside = True
                         for (kx, ky, kz) in corners:
                             if (kx - cx)**2 + (ky - cy)**2 + (kz - cz)**2 > r_sq:
                                 all_inside = False
                                 break

                         if all_inside:
                             grid.fill_chunk(chx, chy, chz, mat_idx)
                             continue

                         # 3. Partial intersection
                         chunk = grid.get_chunk(chx, chy, chz)

                         # Optimize loop bounds based on intersection
                         ix_min = max(min_x, c_min_x)
                         ix_max = min(max_x, c_max_x)
                         iy_min = max(min_y, c_min_y)
                         iy_max = min(max_y, c_max_y)
                         iz_min = max(min_z, c_min_z)
                         iz_max = min(max_z, c_max_z)

                         for z in range(iz_min, iz_max + 1):
                             lz = z - c_min_z
                             z_term = (z - cz)**2
                             for y in range(iy_min, iy_max + 1):
                                 ly = y - c_min_y
                                 y_term = (y - cy)**2
                                 if z_term + y_term > r_sq: continue

                                 for x in range(ix_min, ix_max + 1):
                                     if z_term + y_term + (x - cx)**2 <= r_sq:
                                         lx = x - c_min_x
                                         idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE
                                         chunk[idx] = mat_idx

        elif isinstance(shape, Pyramid):
            cx, cy, cz = shape.base_center
            h = shape.height
            mat_idx = PALETTE_MAP.get(shape.material, 1)
            for y_offset in range(h):
                y = cy + y_offset
                half_size = h - y_offset - 1
                if half_size < 0: break
                for x in range(cx - half_size, cx + half_size + 1):
                    for z in range(cz - half_size, cz + half_size + 1):
                        grid.set_voxel(x, y, z, mat_idx)

    # Convert chunks to RLE
    response_chunks = []
    for (cx, cy, cz), voxels in grid.chunks.items():
        if not voxels: continue

        rle_parts = []
        current_val = voxels[0]
        current_count = 1

        for val in voxels[1:]:
            if val == current_val:
                current_count += 1
            else:
                rle_parts.append(f"{current_val}:{current_count}")
                current_val = val
                current_count = 1
        rle_parts.append(f"{current_val}:{current_count}")

        rle_str = ",".join(rle_parts)

        response_chunks.append(ChunkResponse(
            position=[cx, cy, cz],
            rle_data=rle_str,
            palette=PALETTE
        ))

    return response_chunks

# --- Agent Initialization ---
def get_agent(system_extension: str = ""):
    """
    Initializes and returns the Pydantic AI agent.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        return Agent(
            "openai:gpt-4o",
            output_type=AgentResponse,
            system_prompt=(
                "You are an expert voxel scene generator. Generate complex and visually impressive 3D scenes based on the user's prompt.\n"
                "Instead of listing every voxel, you must define the scene using high-level shapes (Box, Sphere, Pyramid).\n"
                "Coordinates are integers. 1 unit = 1 voxel.\n"
                "The ground is usually at y=0 or y=-1.\n"
                "IMPORTANT: You must position the scene so its center is at (0, 0, 0). The camera is pointed at the origin. Ensure the main elements are centered around (0,0,0).\n"
                "Available materials:\n" + "\n".join([f"- {name}: {desc}" for name, desc in PALETTE_DESCRIPTIONS.items()]) + "\n"
                "IMPORTANT: Use materials intelligently and creatively. Do NOT randomly assign variants. Create visual interest.\n"
                "For complex scenes like 'city', generate multiple boxes for buildings, roads as flat boxes, etc.\n"
                "For 'landscape', use large boxes or spheres to approximate terrain.\n"
                "Be generous with scale. A building might be 10x20x10.\n" +
                system_extension +
                "\nYou will receive context about the current scene state, user selection, and a screenshot.\n"
                "RULES:\n"
                "1. Output MUST be an AgentResponse object. Always provide 'commentary' to explain your actions, ask for clarification if the request is ambiguous, or provide progress updates.\n"
                "2. If you are generating or modifying the scene, provide the 'scene' field with the scene description.\n"
                "3. If 'selectedVoxels' are provided, you must ONLY modify or generate voxels within or immediately adjacent to that selection. Treat the selection as the active workspace.\n"
                "4. If no selection is provided, you may generate or modify the entire scene.\n"
                "5. Maintain visual consistency. Ensure boundaries between new and existing voxels are seamless.\n"
                "6. The scene is represented as a list of chunks. Each chunk has a position [x,y,z] and a list of voxels.\n"
                "7. Supported Voxel Types: " + ", ".join(PALETTE) + ".\n"
                "8. PARTIAL UPDATES: The system supports partial updates. You can return only the shapes/chunks that have changed. The client will merge them with the existing scene. This is cleaner and faster.\n"
                "9. TO CLEAR VOXELS: Use the 'air' material. Overwrite existing voxels with 'air' shapes to remove them."
            )
        )
    logger.error("OPENAI_API_KEY not found.")
    return None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Streaming Logic ---
async def stream_handler(body: dict):
    """
    Handles the streaming response for the CopilotKit agent.

    Processes the request body, extracts messages, runs the agent,
    rasterizes the result, and streams the GraphQL response via SSE.

    Args:
        body: The JSON body of the request containing variables and messages.

    Yields:
        str: Server-Sent Events (SSE) data strings.
    """
    logger.info("Stream handler started")
    try:
        variables = body.get("variables", {})
        data = variables.get("data", {})
        messages = data.get("messages", [])
        if not messages:
            messages = body.get("messages", [])

        # Construct the conversation history / prompt
        full_context = "User Context:\n"
        user_prompt = ""

        for msg in messages:
            role = msg.get("role", "user")
            content = ""
            if "textMessage" in msg:
                content = msg["textMessage"].get("content", "")
            else:
                content = msg.get("content", "")

            # CopilotKit might send readable context as system messages
            if role == "system":
                full_context += f"[System Context]: {content}\n"
            elif role == "user":
                user_prompt = content

            # Check for screenshot in content (if text)
            if "image" in content or "base64" in content:
                 full_context += "[Screenshot provided]\n"

        final_prompt = f"{full_context}\n\nUser Request: {user_prompt}"

        logger.info(f"Running agent with prompt length: {len(final_prompt)}")

        # Extract system instructions from previous messages
        extra_system_prompt = ""
        for msg in messages:
            if msg.get("role") == "system":
                content = msg.get("content", "")
                if isinstance(content, str):
                    extra_system_prompt += content + "\n"

        agent = get_agent(extra_system_prompt)
        if not agent:
            yield f"data: {json.dumps({'error': 'Agent not initialized'})}\n\n"
            return

        # Run the agent
        logger.info("Running agent...")
        result = await agent.run(final_prompt)
        logger.info("Agent run complete.")

        # Process result
        if hasattr(result, 'data'):
             agent_response = result.data
        elif hasattr(result, 'output'):
             agent_response = result.output
        else:
             logger.error(f"Result object keys: {dir(result)}")
             raise ValueError("Cannot find data in agent result")

        response_text = agent_response.commentary

        if agent_response.scene:
             logger.info("Rasterizing scene...")
             chunks = rasterize_scene(agent_response.scene)

             # Convert to dict for JSON
             chunks_data = [chunk.model_dump() for chunk in chunks]

             scene_data = {
                 "chunks": chunks_data
             }
             json_str = json.dumps(scene_data)

             # Append JSON block to commentary
             response_text += f"\n\n```json\n{json_str}\n```"

        graphql_response = {
            "data": {
                "generateCopilotResponse": {
                    "messages": [
                        {
                            "__typename": "TextMessageOutput",
                            "content": [response_text],
                            "role": "assistant",
                            "id": "msg_response"
                        }
                    ]
                }
            }
        }

        yield f"data: {json.dumps(graphql_response)}\n\n"

    except Exception as e:
        logger.error(f"Error in stream_handler: {e}", exc_info=True)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/generate")
async def run_agent_custom(request: Request):
    """
    Main endpoint for CopilotKit interaction.
    """
    try:
        body = await request.json()
    except Exception as e:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    if body.get("operationName") == "availableAgents":
        discovery_data = {
            "data": {
                "availableAgents": {
                    "agents": [{
                        "name": "Voxel Scene Generator",
                        "description": "Generates 3D voxel scenes",
                        "id": "voxel_agent",
                        "__typename": "Agent"
                    }],
                    "__typename": "AvailableAgents"
                }
            }
        }
        return JSONResponse(discovery_data)

    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
