import os
import json
import logging
import sys
import math
import asyncio
import time
from typing import List, Literal, Optional, Union, Dict
from dotenv import load_dotenv
import nest_asyncio

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
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from api.common import PALETTE, PALETTE_MAP, PALETTE_DESCRIPTIONS
from api.pipeline.octree import SparseVoxelOctree, CHUNK_SIZE
from api.pipeline.wfc import WFCLayoutGenerator, ZoneType
from api.pipeline.assets import AssetGenerator
from api.pipeline.super_res import SuperResolver
from api.copilot_utils import CopilotResponseBuilder

# Load environment variables
load_dotenv(dotenv_path='api/.env.local')

# --- Custom Exceptions ---

class APIKeyError(Exception):
    pass

class RateLimitError(Exception):
    pass

class LLMTimeoutError(Exception):
    pass

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

class Cylinder(BaseModel):
    type: Literal['cylinder'] = 'cylinder'
    start: List[int] = Field(description="[x, y, z] center of the base")
    height: int
    radius: float
    material: str
    axis: Literal['x', 'y', 'z'] = 'y'

class Line(BaseModel):
    type: Literal['line'] = 'line'
    start: List[int] = Field(description="[x, y, z] start point")
    end: List[int] = Field(description="[x, y, z] end point")
    width: int = Field(default=1, description="Thickness of the line")
    material: str

class Wedge(BaseModel):
    type: Literal['wedge'] = 'wedge'
    start: List[int] = Field(description="[x, y, z] corner of the bounding box")
    size: List[int] = Field(description="[width, height, depth]")
    orientation: Literal['xn', 'xp', 'zn', 'zp'] = Field(description="Direction the ramp ascends towards")
    material: str

class Tree(BaseModel):
    type: Literal['tree'] = 'tree'
    base: List[int] = Field(description="[x, y, z] base of the trunk")
    height: int = Field(description="Total height")
    kind: Literal['oak', 'pine'] = 'oak'
    material_trunk: str = 'wood'
    material_leaves: str = 'leaves'

class House(BaseModel):
    type: Literal['house'] = 'house'
    base_center: List[int] = Field(description="[x, y, z] center of the floor")
    width: int
    depth: int
    height: int = Field(description="Wall height")
    roof_height: int
    material_wall: str = 'brick'
    material_roof: str = 'roof'

class Flower(BaseModel):
    type: Literal['flower'] = 'flower'
    base: List[int] = Field(description="[x, y, z] base of the stem")
    height: int = Field(default=1, description="Height of the stem")
    color: Literal['red', 'yellow', 'purple'] = 'red'

class Shrub(BaseModel):
    type: Literal['shrub'] = 'shrub'
    center: List[int] = Field(description="[x, y, z] center of the shrub base")
    radius: float = Field(description="Radius of the shrub")
    material: str = 'shrub'

class SceneDescription(BaseModel):
    shapes: List[Union[Box, Sphere, Pyramid, Cylinder, Line, Wedge, Tree, House, Flower, Shrub]] = Field(description="List of shapes composing the scene")

class AgentResponse(BaseModel):
    commentary: str = Field(description="Conversational response to the user.")
    scene: Optional[SceneDescription] = Field(default=None, description="The 3D scene generation data (for specific shapes/edits).")
    layout_intent: Optional[Literal['city', 'village', 'forest']] = Field(default=None, description="If generating a large NEW scene, specify the type here to use the Advanced Pipeline.")

# --- API Models ---
class ChunkResponse(BaseModel):
    position: List[int]
    rle_data: str
    palette: List[str]

# --- Constants ---
MIN_COORD = -512
MAX_COORD = 512

# --- Rate Limiting ---
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 10
request_counts = {}

def check_rate_limit(client_ip: str):
    current_time = time.time()
    if client_ip not in request_counts:
        request_counts[client_ip] = []
    request_counts[client_ip] = [t for t in request_counts[client_ip] if t > current_time - RATE_LIMIT_WINDOW]
    if len(request_counts[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise RateLimitError("Too many requests")
    request_counts[client_ip].append(current_time)

# --- Rasterization Logic ---
class VoxelGrid:
    def __init__(self):
        self.chunks: Dict[tuple, List[int]] = {}

    def get_chunk(self, cx, cy, cz):
        key = (cx, cy, cz)
        if key not in self.chunks:
            self.chunks[key] = [0] * (CHUNK_SIZE ** 3)
        return self.chunks[key]

    def fill_chunk(self, cx, cy, cz, material_idx):
        self.chunks[(cx, cy, cz)] = [material_idx] * (CHUNK_SIZE ** 3)

    def set_voxel(self, x, y, z, material_idx):
        if not (MIN_COORD <= x < MAX_COORD and MIN_COORD <= y < MAX_COORD and MIN_COORD <= z < MAX_COORD):
            return
        cx, rx = divmod(x, CHUNK_SIZE)
        cy, ry = divmod(y, CHUNK_SIZE)
        cz, rz = divmod(z, CHUNK_SIZE)
        chunk = self.get_chunk(cx, cy, cz)
        index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
        chunk[index] = material_idx

def convert_grid_to_chunks(chunks_dict: Dict[tuple, List[int]]) -> List[ChunkResponse]:
    response_chunks = []
    for (cx, cy, cz), voxels in chunks_dict.items():
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
        response_chunks.append(ChunkResponse(position=[cx, cy, cz], rle_data=rle_str, palette=PALETTE))
    return response_chunks

def rasterize_scene(scene_desc: SceneDescription) -> List[ChunkResponse]:
    logger.info(f"Rasterizing {len(scene_desc.shapes)} shapes")
    grid = VoxelGrid()
    for shape in scene_desc.shapes:
        try:
            mat_name = getattr(shape, 'material', 'stone')
            mat_idx = PALETTE_MAP.get(mat_name, 1)

            if isinstance(shape, Box):
                sx, sy, sz = shape.start
                w, h, d = shape.size
                ex, ey, ez = sx + w, sy + h, sz + d
                min_cx, min_rx = divmod(sx, CHUNK_SIZE)
                min_cy, min_ry = divmod(sy, CHUNK_SIZE)
                min_cz, min_rz = divmod(sz, CHUNK_SIZE)
                max_cx = (ex - 1) // CHUNK_SIZE
                max_cy = (ey - 1) // CHUNK_SIZE
                max_cz = (ez - 1) // CHUNK_SIZE
                for cx in range(min_cx, max_cx + 1):
                    for cy in range(min_cy, max_cy + 1):
                        for cz in range(min_cz, max_cz + 1):
                            csx, csy, csz = cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE
                            cex, cey, cez = csx + CHUNK_SIZE, csy + CHUNK_SIZE, csz + CHUNK_SIZE
                            isx, isy, isz = max(sx, csx), max(sy, csy), max(sz, csz)
                            iex, iey, iez = min(ex, cex), min(ey, cey), min(ez, cez)
                            if isx >= iex or isy >= iey or isz >= iez: continue
                            if isx == csx and iex == cex and isy == csy and iey == cey and isz == csz and iez == cez:
                                grid.fill_chunk(cx, cy, cz, mat_idx)
                            else:
                                chunk = grid.get_chunk(cx, cy, cz)
                                for z in range(isz - csz, iez - csz):
                                    z_offset = z * CHUNK_SIZE * CHUNK_SIZE
                                    for y in range(isy - csy, iey - csy):
                                        y_offset = y * CHUNK_SIZE
                                        base = z_offset + y_offset
                                        for x in range(isx - csx, iex - csx):
                                            chunk[base + x] = mat_idx
            elif isinstance(shape, Sphere):
                cx, cy, cz = shape.center
                r = shape.radius
                r_sq = r * r
                min_x, max_x = int(cx - r), int(cx + r) + 1
                min_y, max_y = int(cy - r), int(cy + r) + 1
                min_z, max_z = int(cz - r), int(cz + r) + 1
                for x in range(min_x, max_x):
                    for y in range(min_y, max_y):
                        for z in range(min_z, max_z):
                            if (x - cx)**2 + (y - cy)**2 + (z - cz)**2 <= r_sq:
                                grid.set_voxel(x, y, z, mat_idx)
            elif isinstance(shape, Pyramid):
                cx, cy, cz = shape.base_center
                h = shape.height
                for y_off in range(h):
                    y = cy + y_off
                    half = h - y_off - 1
                    for x in range(cx - half, cx + half + 1):
                        for z in range(cz - half, cz + half + 1):
                            grid.set_voxel(x, y, z, mat_idx)
            elif isinstance(shape, Cylinder):
                sx, sy, sz = shape.start
                h = shape.height
                r = shape.radius
                r_sq = r * r
                axis = shape.axis
                if axis == 'y':
                    for y in range(sy, sy + h):
                        for x in range(int(sx - r), int(sx + r) + 1):
                            for z in range(int(sz - r), int(sz + r) + 1):
                                if (x - sx)**2 + (z - sz)**2 <= r_sq:
                                    grid.set_voxel(x, y, z, mat_idx)
                elif axis == 'x':
                    for x in range(sx, sx + h):
                        for y in range(int(sy - r), int(sy + r) + 1):
                            for z in range(int(sz - r), int(sz + r) + 1):
                                if (y - sy)**2 + (z - sz)**2 <= r_sq:
                                    grid.set_voxel(x, y, z, mat_idx)
                elif axis == 'z':
                    for z in range(sz, sz + h):
                        for x in range(int(sx - r), int(sx + r) + 1):
                            for y in range(int(sy - r), int(sy + r) + 1):
                                if (x - sx)**2 + (y - sy)**2 <= r_sq:
                                    grid.set_voxel(x, y, z, mat_idx)
            elif isinstance(shape, Line):
                x1, y1, z1 = shape.start
                x2, y2, z2 = shape.end
                w = shape.width
                dx, dy, dz = x2 - x1, y2 - y1, z2 - z1
                steps = max(abs(dx), abs(dy), abs(dz))
                if steps == 0:
                    grid.set_voxel(x1, y1, z1, mat_idx)
                else:
                    for i in range(steps + 1):
                        t = i / steps
                        x, y, z = int(x1 + dx * t), int(y1 + dy * t), int(z1 + dz * t)
                        half = w // 2
                        for wx in range(x - half, x - half + w):
                            for wy in range(y - half, y - half + w):
                                for wz in range(z - half, z - half + w):
                                    grid.set_voxel(wx, wy, wz, mat_idx)
            elif isinstance(shape, Wedge):
                sx, sy, sz = shape.start
                w, h, d = shape.size
                orient = shape.orientation
                for x in range(sx, sx + w):
                    for y in range(sy, sy + h):
                        for z in range(sz, sz + d):
                            lx, ly, lz = x - sx, y - sy, z - sz
                            threshold = 0
                            if orient == 'xp': threshold = (lx / w) * h
                            elif orient == 'xn': threshold = ((w - 1 - lx) / w) * h
                            elif orient == 'zp': threshold = (lz / d) * h
                            elif orient == 'zn': threshold = ((d - 1 - lz) / d) * h
                            if ly <= threshold: grid.set_voxel(x, y, z, mat_idx)
            elif isinstance(shape, Tree):
                bx, by, bz = shape.base
                h = shape.height
                kind = shape.kind
                mat_trunk = PALETTE_MAP.get(shape.material_trunk, PALETTE_MAP['wood'])
                mat_leaves = PALETTE_MAP.get(shape.material_leaves, PALETTE_MAP['leaves'])
                seed = (bx * 73856093) ^ (by * 19349663) ^ (bz * 83492791)
                h_var = h + (seed % 3) - 1
                if h_var < 2: h_var = 2
                trunk_h = int(h_var * 0.3)
                if trunk_h < 1: trunk_h = 1
                for y in range(by, by + trunk_h):
                    grid.set_voxel(bx, y, bz, mat_trunk)
                    if h_var > 8 and y < by + 2:
                        grid.set_voxel(bx+1, y, bz, mat_trunk)
                        grid.set_voxel(bx-1, y, bz, mat_trunk)
                        grid.set_voxel(bx, y, bz+1, mat_trunk)
                        grid.set_voxel(bx, y, bz-1, mat_trunk)
                canopy_start_y = by + trunk_h - 1
                canopy_h = h_var - trunk_h + 1
                if kind == 'pine':
                    current_y = canopy_start_y
                    max_r = int(h_var * 0.35)
                    for r in range(max_r, -1, -1):
                        step_h = 2 if r > 0 else 1
                        for y in range(current_y, current_y + step_h):
                             for x in range(bx - r, bx + r + 1):
                                 for z in range(bz - r, bz + r + 1):
                                     if (x - bx)**2 + (z - bz)**2 <= r*r + 1:
                                         grid.set_voxel(x, y, z, mat_leaves)
                        current_y += step_h
                else: # Oak
                    cy = canopy_start_y + int(canopy_h * 0.5)
                    cr = int(canopy_h * 0.5) + (seed % 2)
                    r_sq = cr * cr
                    for x in range(bx - cr, bx + cr + 1):
                        for y in range(canopy_start_y, canopy_start_y + canopy_h + 1):
                             for z in range(bz - cr, bz + cr + 1):
                                 if (x - bx)**2 + (y - cy)**2 + (z - bz)**2 <= r_sq:
                                     grid.set_voxel(x, y, z, mat_leaves)
            elif isinstance(shape, House):
                cx, cy, cz = shape.base_center
                w, d = shape.width, shape.depth
                h_wall = shape.height
                h_roof = shape.roof_height
                mat_wall = PALETTE_MAP.get(shape.material_wall, PALETTE_MAP['brick'])
                mat_roof = PALETTE_MAP.get(shape.material_roof, PALETTE_MAP['roof'])
                sx, sy, sz = cx - w//2, cy, cz - d//2
                ex, ey, ez = sx + w, sy + h_wall, sz + d
                for x in range(sx, ex):
                    for y in range(sy, ey):
                        for z in range(sz, ez):
                            grid.set_voxel(x, y, z, mat_wall)
                if w > d: axis, long_dim, short_dim = 'x', w, d
                else: axis, long_dim, short_dim = 'z', d, w
                if abs(w - d) < 3:
                     base_y = ey
                     for y_off in range(h_roof):
                         y = base_y + y_off
                         inset = y_off
                         for x in range(sx + inset, ex - inset):
                             for z in range(sz + inset, ez - inset):
                                 grid.set_voxel(x, y, z, mat_roof)
                else:
                    base_y = ey
                    center_short = sx + w//2 if axis == 'z' else sz + d//2
                    for y_off in range(h_roof):
                        y = base_y + y_off
                        progress = y_off / h_roof
                        current_half_span = (short_dim / 2) * (1 - progress)
                        if axis == 'x':
                             cz_local = sz + d//2
                             z_start = int(cz_local - current_half_span)
                             z_end = int(cz_local + current_half_span)
                             for x in range(sx, ex):
                                 for z in range(z_start, z_end + 1):
                                     grid.set_voxel(x, y, z, mat_roof)
                        else:
                             cx_local = sx + w//2
                             x_start = int(cx_local - current_half_span)
                             x_end = int(cx_local + current_half_span)
                             for z in range(sz, ez):
                                 for x in range(x_start, x_end + 1):
                                     grid.set_voxel(x, y, z, mat_roof)
            elif isinstance(shape, Flower):
                bx, by, bz = shape.base
                h = shape.height
                flower_mat = PALETTE_MAP.get(f"flower_{shape.color}", PALETTE_MAP['flower_red'])
                leaves_mat = PALETTE_MAP['leaves']
                # Stem
                for y in range(by, by + h):
                     grid.set_voxel(bx, y, bz, leaves_mat)
                # Flower head
                grid.set_voxel(bx, by + h, bz, flower_mat)
                grid.set_voxel(bx + 1, by + h, bz, flower_mat)
                grid.set_voxel(bx - 1, by + h, bz, flower_mat)
                grid.set_voxel(bx, by + h, bz + 1, flower_mat)
                grid.set_voxel(bx, by + h, bz - 1, flower_mat)

            elif isinstance(shape, Shrub):
                cx, cy, cz = shape.center
                r = shape.radius
                r_sq = r * r
                mat = PALETTE_MAP.get(shape.material, PALETTE_MAP['shrub'])
                min_x, max_x = int(cx - r), int(cx + r) + 1
                min_y, max_y = int(cy - r), int(cy + r) + 1
                min_z, max_z = int(cz - r), int(cz + r) + 1
                for x in range(min_x, max_x):
                    for y in range(min_y, max_y):
                        for z in range(min_z, max_z):
                            if (x - cx)**2 + (y - cy)**2 + (z - cz)**2 <= r_sq: # Assuming half-sphere for shrub sitting on ground usually? Or full sphere? Full sphere is fine.
                                # To make it look like a bush on the ground, we might want to flatten the bottom slightly or just let it clip.
                                # Let's stick to full sphere for now.
                                grid.set_voxel(x, y, z, mat)
        except Exception as e:
            logger.error(f"Error rasterizing shape {shape}: {e}")

    return convert_grid_to_chunks(grid.chunks)

def run_pipeline(intent: str) -> List[ChunkResponse]:
    logger.info(f"Running Hierarchical Pipeline for intent: {intent}")
    # 1. WFC Layout
    # Create a 10x10x10 block grid (320x320x320 voxels approximately)
    wfc = WFCLayoutGenerator(10, 10, 10)
    blocks = wfc.generate()

    octree = SparseVoxelOctree()

    # 2. Asset Generation (Latent Voxel Diffusion Simulation)
    assets = AssetGenerator(octree)
    for block in blocks:
        assets.generate_block(block)

    # 3. Super Resolution (Detail Pass)
    sr = SuperResolver(octree)
    sr.apply_detail_pass()

    # Convert to Chunks
    return convert_grid_to_chunks(octree.chunks)

def get_agent(system_extension: str = ""):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise APIKeyError("OPENAI_API_KEY not configured")

    return Agent(
        "openai:gpt-4o",
        output_type=AgentResponse,
        system_prompt=(
            "You are Voxelito, an expert artistic voxel scene generator.\n"
            "Personality: Creative, detail-oriented, enthusiastic.\n"
            "Greeting: Hola! Ready to build something spectacular?\n"
            "\n"
            "MODES:\n"
            "1. **Editing / Small Objects**: Return `scene` with specific shapes.\n"
            "2. **New Large Scene**: Return `layout_intent` ('city', 'village') to use the advanced pipeline. DO NOT return `scene` shapes for full cities, use `layout_intent`.\n"
            "\n"
            "SCENE SCALES:\n"
            "- Small/Edit: Use 'scene' with Box, Tree, etc.\n"
            "- Large City/Village: Use 'layout_intent'.\n"
            "\n"
            "Available materials:\n" + "\n".join([f"- {name}: {desc}" for name, desc in PALETTE_DESCRIPTIONS.items()]) + "\n"
            "\n" + system_extension + "\n"
            "RULES:\n"
            "1. Output must be an AgentResponse.\n"
            "2. Provide 'commentary'.\n"
            "3. If the user asks for a City, Town, or huge landscape, SET `layout_intent` and explain you are using the 'Hierarchical Pipeline'.\n"
            "4. If editing, use `scene`.\n"
        )
    )

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def stream_handler(body: dict, client_ip: str):
    logger.info(f"Stream handler started for IP: {client_ip}")
    try:
        check_rate_limit(client_ip)

        variables = body.get("variables", {})
        data = variables.get("data", {})
        messages = data.get("messages", [])
        if not messages:
            messages = body.get("messages", [])

        full_context = "User Context:\n"
        user_prompt = ""

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("textMessage", {}).get("content", "") or msg.get("content", "")

            if role == "system":
                full_context += f"[System Context]: {content}\n"
            elif role == "user":
                user_prompt = content

            if "image" in content or "base64" in content:
                 full_context += "[Screenshot provided]\n"

        final_prompt = f"{full_context}\n\nUser Request: {user_prompt}"

        extra_system_prompt = ""
        for msg in messages:
             if msg.get("role") == "system":
                 content = msg.get("content", "")
                 if isinstance(content, str):
                     extra_system_prompt += content + "\n"

        agent = get_agent(extra_system_prompt)

        try:
            result = await asyncio.wait_for(agent.run(final_prompt), timeout=120.0)
        except asyncio.TimeoutError:
            raise LLMTimeoutError("Generation took too long.")

        if hasattr(result, 'data'):
             agent_response = result.data
        elif hasattr(result, 'output'):
             agent_response = result.output
        else:
             raise ValueError("Cannot find data in agent result")

        chunks_data = []
        if agent_response.layout_intent:
             # Use Pipeline
             logger.info(f"Using pipeline for intent: {agent_response.layout_intent}")
             chunks = run_pipeline(agent_response.layout_intent)
             chunks_data = [chunk.model_dump() for chunk in chunks]
        elif agent_response.scene:
             # Use Rasterizer
             chunks = rasterize_scene(agent_response.scene)
             chunks_data = [chunk.model_dump() for chunk in chunks]

        data_payload = None
        if chunks_data:
             data_payload = { "chunks": chunks_data }

        yield CopilotResponseBuilder.create_success_response(agent_response.commentary, data_payload)

    except Exception as e:
        logger.error(f"Error in stream_handler: {e}", exc_info=True)
        yield CopilotResponseBuilder.create_error_response(str(e))

@app.post("/api/generate")
async def run_agent_custom(request: Request):
    try:
        body = await request.json()
    except Exception as e:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    if body.get("operationName") == "availableAgents":
        return JSONResponse({"data": {"availableAgents": {"agents": [{"name": "Voxel Scene Generator", "id": "voxel_agent", "__typename": "Agent"}], "__typename": "AvailableAgents"}}})

    client_ip = request.client.host if request.client else "unknown"
    return StreamingResponse(stream_handler(body, client_ip), media_type="text/event-stream")
