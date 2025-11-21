import os
import json
from dotenv import load_dotenv
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
    """A 3D scene composed of voxels, organized in chunks."""
    scene: SceneData = Field(description="The chunk and voxel data for the 3D scene.")

# --- Agent Initialization ---
def get_agent():
    if "OPENAI_API_KEY" in os.environ and os.environ["OPENAI_API_KEY"]:
        return Agent(
            "openai:gpt-4o",
            output_type=AI_SceneDescription,
            system_prompt="You are a voxel scene generator. Generate 3D scenes based on the user's prompt."
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
        result = agent.run(prompt)

        # Wrap result in a structure the frontend can parse
        scene_data = result.data.scene.model_dump()

        # Send the data event
        yield f"data: {json.dumps(scene_data)}\n\n"

    except Exception as e:
        print(f"Error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/generate")
async def run_agent_custom(request: Request):
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
