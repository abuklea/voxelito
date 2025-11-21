import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse

# Load environment variables
load_dotenv(dotenv_path='api/.env.local')

# --- Pydantic Models ---
class Voxel(BaseModel):
    x: int
    y: int
    z: int
    type: str  # Use string for type names like 'grass', 'stone'

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
            instructions=[
                "You are a helpful assistant that generates 3D voxel scenes based on user descriptions.",
                "Generate a scene that matches the user's request, organizing voxels into chunks at position [0,0,0].",
                "The origin (0,0,0) is at the center of the base.",
                "The y-axis is vertical.",
                "Use voxel types like 'grass', 'stone', 'dirt', etc."
            ],
        )
    else:
        print("OPENAI_API_KEY is not set. Using a mock agent.")
        # This mock agent will not work with the current setup, an API key is required.
        return None

app = FastAPI()

# --- Streaming Logic ---
async def stream_handler(request: Request):
    """
    Handles both CopilotKit discovery and scene generation within a single streaming endpoint.
    """
    try:
        body = await request.json()
        print(f"Received request body: {body}")

        # Case 1: CopilotKit discovery query
        if body.get("operationName") == "availableAgents":
            discovery_data = {
                "data": {
                    "availableAgents": {
                        "agents": [{
                            "name": "Voxel Scene Generator",
                            "id": "voxel_scene_generator",
                            "description": "Generates a 3D voxel scene from a text prompt.",
                            "__typename": "Agent"
                        }],
                        "__typename": "AvailableAgents"
                    }
                }
            }
            yield f"data: {json.dumps(discovery_data)}\n\n"
            return

        # Case 2: Scene generation prompt
        prompt = ""
        if "messages" in body and isinstance(body["messages"], list) and len(body["messages"]) > 0:
            last_message = body["messages"][-1]
            if last_message.get("role") == "user":
                prompt = last_message.get("content", "")

        if not prompt:
            error_data = {"error": "Prompt not found in request body."}
            yield f"data: {json.dumps(error_data)}\n\n"
            return

        agent = get_agent()
        if agent is None:
            error_data = {"error": "AI Agent not configured. OPENAI_API_KEY is missing."}
            yield f"data: {json.dumps(error_data)}\n\n"
            return

        # Pydantic-AI v2 .run() is not async, run it and then yield the result
        result = agent.run(prompt)
        # The frontend expects the 'scene' object directly
        scene_data = result.output.scene.dict()
        yield f"data: {json.dumps(scene_data)}\n\n"

    except Exception as e:
        print(f"An error occurred in stream_handler: {e}")
        error_data = {"error": str(e)}
        yield f"data: {json.dumps(error_data)}\n\n"

@app.post("/api/generate")
async def run_agent_custom(request: Request) -> Response:
    """
    Endpoint that serves the streaming response for all CopilotKit interactions.
    """
    return StreamingResponse(stream_handler(request), media_type="text/event-stream")
