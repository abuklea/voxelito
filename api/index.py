import os
import json
import traceback
import logging
import sys
from dotenv import load_dotenv

logging.basicConfig(stream=sys.stderr, level=logging.ERROR)
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
try:
    from pydantic_ai.ui.ag_ui import AGUIAdapter
except ImportError:
    # Fallback if AGUIAdapter is not found or moved
    print("Warning: AGUIAdapter not found in pydantic_ai.ui.ag_ui")
    AGUIAdapter = None

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
    """A 3D scene composed of voxels, organized in chunks."""
    scene: SceneData = Field(description="The chunk and voxel data for the 3D scene.")

# --- Agent Initialization ---
def get_agent():
    if "OPENAI_API_KEY" in os.environ and os.environ["OPENAI_API_KEY"]:
        return Agent(
            "openai:gpt-4o",
            output_type=AI_SceneDescription,
            system_prompt=(
                "You are a voxel scene generator. Generate 3D scenes based on the user's prompt.\n"
                "You must generate a list of chunks, each containing a list of voxels.\n"
                "The available voxel types are: 'grass', 'stone', 'dirt', 'water', 'wood', 'leaves', 'sand', "
                "'brick', 'roof', 'glass', 'plank', 'concrete', 'asphalt', 'road_white', 'road_yellow', "
                "'neon_blue', 'neon_pink', 'metal', 'snow', 'lava'.\n"
                "Use these types to create detailed and varied scenes."
            )
        )
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
    try:
        # Extract prompt from CopilotKit's message format
        messages = body.get("messages", [])
        prompt = messages[-1].get("content", "") if messages else ""

        if not prompt:
            yield f"data: {json.dumps({'error': 'No prompt found'})}\n\n"
            return

        agent = get_agent()
        if not agent:
            yield f"data: {json.dumps({'error': 'Agent not initialized'})}\n\n"
            return

        # Run the agent
        result = await agent.run(prompt)

        # Wrap result in a structure the frontend can parse
        scene_data = result.data.scene.model_dump()

        # Send the data event
        # We double-dump to ensure the client receives a string containing the JSON
        yield f"data: {json.dumps(json.dumps(scene_data))}\n\n"

    except Exception as e:
        print(f"Error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

async def stream_with_logging(stream):
    try:
        async for chunk in stream:
            yield chunk
    except Exception as e:
        logging.error(f"Error during streaming: {e}", exc_info=True)
        # We can't really change the status code now, but we can maybe yield an error chunk if the protocol supports it
        raise e

@app.post("/api/generate")
async def run_agent_custom(request: Request):
    if AGUIAdapter:
        try:
            agent = get_agent()
            if not agent:
                return JSONResponse({"error": "Agent not initialized"}, status_code=500)

            # Use the official dispatch method if available
            return await AGUIAdapter.dispatch_request(request, agent=agent)
        except Exception as e:
            logging.error(f"Error in AGUIAdapter: {e}", exc_info=True)
            return JSONResponse({"error": str(e)}, status_code=500)

    # Fallback manual implementation if AGUIAdapter is missing
    body = await request.json()

    # [CHANGE 2] Handle Discovery as JSON
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
        return JSONResponse(content=discovery_data)

    # [CHANGE 3] Handle Chat as Stream
    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
