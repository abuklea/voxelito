import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse

# Load environment variables from .env.local
load_dotenv(dotenv_path='api/.env.local')

# Define the structured output models
class Voxel(BaseModel):
    x: int
    y: int
    z: int
    type: int

class VoxelScene(BaseModel):
    voxels: list[Voxel]

class AI_SceneDescription(BaseModel):
    """A 3D scene composed of voxels."""
    scene: VoxelScene = Field(description="The voxel data for the 3D scene.")

def get_agent():
    """
    Initializes and returns the appropriate agent based on the presence of the OpenAI API key.
    """
    if "OPENAI_API_KEY" in os.environ and os.environ["OPENAI_API_KEY"]:
        return Agent(
            "openai:gpt-4o",
            output_type=AI_SceneDescription,
            instructions=[
                "You are a helpful assistant that generates 3D voxel scenes based on user descriptions.",
                "Generate a scene that matches the user's request.",
                "The origin (0,0,0) is at the center of the base.",
                "The y-axis is vertical."
            ],
        )
    else:
        print("OPENAI_API_KEY is not set in the environment. Using a mock agent.")
        return Agent()

app = FastAPI()

async def generate_scene(prompt: str):
    """
    A generator function that streams the agent's response.
    """
    agent = get_agent()
    result = agent.run(prompt)

    # In a real application, you would stream the response.
    # For now, we'll just yield the final result.
    yield json.dumps({"scene": result.output.scene.dict()})

@app.post("/api/generate")
async def run_agent_custom(request: Request) -> Response:
    """
    A custom endpoint to handle the agent execution request.
    """
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        if not prompt:
            return Response(content='{"error": "Prompt is required."}', status_code=400)

        return StreamingResponse(generate_scene(prompt), media_type="application/json")

    except json.JSONDecodeError:
        return Response(content='{"error": "Invalid JSON."}', status_code=400)
    except Exception as e:
        return Response(content=f'{{"error": "{str(e)}"}}', status_code=500)
