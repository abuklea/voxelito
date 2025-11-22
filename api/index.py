import os
import json
import traceback
import logging
import sys
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

# --- Pydantic Models ---
class Voxel(BaseModel):
    x: int
    y: int
    z: int
    type: str

class Chunk(BaseModel):
    position: list[int]
    voxels: list[Voxel]

class SceneData(BaseModel):
    chunks: list[Chunk]

class AI_SceneDescription(BaseModel):
    scene: SceneData = Field(description="The chunk and voxel data for the 3D scene.")

# --- Agent Initialization ---
def get_agent():
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        return Agent(
            "openai:gpt-4o",
            output_type=AI_SceneDescription,
            system_prompt=(
                "You are a voxel scene generator. Generate 3D scenes based on the user's prompt.\n"
                "You will receive context about the current scene state, user selection, and a screenshot.\n"
                "RULES:\n"
                "1. If 'selectedVoxels' are provided, you must ONLY modify or generate voxels within or immediately adjacent to that selection. Treat the selection as the active workspace.\n"
                "2. If no selection is provided, you may generate or modify the entire scene.\n"
                "3. Maintain visual consistency. Ensure boundaries between new and existing voxels are seamless.\n"
                "4. The scene is represented as a list of chunks. Each chunk has a position [x,y,z] and a list of voxels.\n"
                "5. Supported Voxel Types: 'grass', 'stone', 'dirt', 'water', 'wood', 'leaves', 'sand', "
                "'brick', 'roof', 'glass', 'plank', 'concrete', 'asphalt', 'road_white', 'road_yellow', "
                "'neon_blue', 'neon_pink', 'metal', 'snow', 'lava'.\n"
                "6. Return the full scene data including your changes, or at least the chunks you modified."
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
    logger.info("Stream handler started")
    try:
        variables = body.get("variables", {})
        data = variables.get("data", {})
        messages = data.get("messages", [])
        if not messages:
            messages = body.get("messages", [])

        # Construct the conversation history / prompt
        # We want to include the System Context (Readable) if present

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
                # Keep the last user prompt as the main prompt, but append previous?
                # For simplicity, let's concatenate everything relevant
                user_prompt = content # Assume last user message is the prompt
                # If there's history, we might want to append it too, but let's focus on current state + prompt

            # Check for screenshot in content (if text)
            if "image" in content or "base64" in content:
                 full_context += "[Screenshot provided]\n"

        # Fallback: If we can't find explicit system messages, we rely on the user prompt
        # containing the context if CopilotKit injected it there.

        final_prompt = f"{full_context}\n\nUser Request: {user_prompt}"

        logger.info(f"Running agent with prompt length: {len(final_prompt)}")

        agent = get_agent()
        if not agent:
            yield f"data: {json.dumps({'error': 'Agent not initialized'})}\n\n"
            return

        # Run the agent
        result = await run_in_threadpool(agent.run_sync, final_prompt)

        # Wrap result
        scene_data = result.output.scene.model_dump()
        json_str = json.dumps(scene_data)

        graphql_response = {
            "data": {
                "generateCopilotResponse": {
                    "messages": [
                        {
                            "__typename": "TextMessageOutput",
                            "content": [json_str],
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
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    if body.get("operationName") == "availableAgents":
        return JSONResponse({
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
        })

    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
