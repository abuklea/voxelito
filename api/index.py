import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.ui.ag_ui import AGUIAdapter
from fastapi import FastAPI, Request, Response

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

@app.post("/api/generate")
async def run_agent(request: Request) -> Response:
    """
    Handles the agent execution request and returns a streaming response.
    """
    agent = get_agent()
    return await AGUIAdapter.dispatch_request(request, agent=agent)
