import os
import json
import traceback
import logging
import sys
from dotenv import load_dotenv
import nest_asyncio
from fastapi.concurrency import run_in_threadpool

nest_asyncio.apply()

# Configure logging to ensure we see output immediately
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

# Force fallback manual handler
AGUIAdapter = None

# Load environment variables
load_dotenv(dotenv_path='api/.env.local')

# --- Pydantic Models ---
class Voxel(BaseModel):
    """
    Represents a single voxel in the 3D space.

    Attributes:
        x (int): The x-coordinate of the voxel.
        y (int): The y-coordinate of the voxel.
        z (int): The z-coordinate of the voxel.
        type (str): The type/material of the voxel (e.g., 'grass', 'stone').
    """
    x: int
    y: int
    z: int
    type: str

class Chunk(BaseModel):
    """
    Represents a chunk of voxels in the scene.

    Attributes:
        position (list[int]): The position of the chunk as a list of integers.
        voxels (list[Voxel]): A list of Voxel objects contained within this chunk.
    """
    position: list[int]
    voxels: list[Voxel]

class SceneData(BaseModel):
    """
    Container for the entire scene data.

    Attributes:
        chunks (list[Chunk]): A list of chunks that make up the scene.
    """
    chunks: list[Chunk]

class AI_SceneDescription(BaseModel):
    """
    A 3D scene composed of voxels, organized in chunks.

    Attributes:
        scene (SceneData): The chunk and voxel data for the 3D scene.
    """
    scene: SceneData = Field(description="The chunk and voxel data for the 3D scene.")

# --- Agent Initialization ---
def get_agent():
    """
    Initializes and returns the Pydantic AI Agent with the OpenAI model.

    Returns:
        Agent | None: The configured Agent instance if OPENAI_API_KEY is set, otherwise None.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        logger.info(f"Initializing Agent with API Key: {api_key[:5]}...")
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
    Async generator that handles the streaming response for the chat agent.

    It parses the incoming request body to extract the user's prompt, runs the AI agent
    synchronously within a thread pool, and yields the result as a Server-Sent Event (SSE).
    The response is formatted to match the GraphQL structure expected by CopilotKit.

    Args:
        body (dict): The JSON body of the request containing variables and messages.

    Yields:
        str: A string formatted as an SSE data event containing the JSON-serialized GraphQL response.
    """
    logger.info("Stream handler started")
    try:
        # Parsing logic for CopilotKit GraphQL request
        variables = body.get("variables", {})
        data = variables.get("data", {})

        messages = data.get("messages", [])
        if not messages:
            messages = body.get("messages", [])

        if messages:
            last_message = messages[-1]
            if "textMessage" in last_message:
                prompt = last_message["textMessage"].get("content", "")
            else:
                prompt = last_message.get("content", "")
        else:
            prompt = ""

        logger.info(f"Prompt extracted: {prompt}")

        if not prompt:
            yield f"data: {json.dumps({'error': 'No prompt found'})}\n\n"
            return

        agent = get_agent()
        if not agent:
            yield f"data: {json.dumps({'error': 'Agent not initialized'})}\n\n"
            return

        # Run the agent
        logger.info("Running agent...")
        # Use run_sync in a threadpool to avoid async loop conflicts
        result = await run_in_threadpool(agent.run_sync, prompt)
        logger.info("Agent run complete.")

        # Wrap result in a structure the frontend can parse
        scene_data = result.output.scene.model_dump()
        json_str = json.dumps(scene_data)

        # Construct a response format that CopilotKit might accept
        # TextMessageOutput style
        response_payload = {
            "result": json_str # Trying 'result' as a fallback key often used in GraphQL custom scalars
        }

        # Or better, let's try the 'content' directly if it expects text
        # But previous attempt with text string crashed it.
        # Previous attempt with {content: ...} is UNTESTED.
        # Let's try the OpenAI-ish structure again but with "text" key?

        # Let's go with the TextMessageOutput structure based on the query
        # The query asks for `... on TextMessageOutput { content }`
        # The response should match the GraphQL shape.
        # data: { data: { generateCopilotResponse: { messages: [ ... ] } } }

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
    """
    Endpoint to handle agent generation requests.

    This endpoint supports two types of operations:
    1. "availableAgents" discovery: Returns a JSON list of available agents.
    2. Chat generation: Streams the agent's response based on the user's prompt using SSE.

    Args:
        request (Request): The incoming FastAPI request object.

    Returns:
        JSONResponse | StreamingResponse: A JSON response for discovery or a streaming response for chat.
    """
    logger.info("Received request at /api/generate")
    try:
        body = await request.json()
        logger.info(f"Request body: {json.dumps(body)}...")
    except Exception as e:
        logger.error(f"Failed to parse body: {e}")
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    # Handle Discovery as JSON
    if body.get("operationName") == "availableAgents":
        logger.info("Handling availableAgents discovery")
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

    # Handle Chat as Stream
    logger.info("Handling chat stream")
    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
