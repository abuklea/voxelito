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
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        logger.info(f"Initializing Agent with API Key: {api_key[:5]}...")
        return Agent(
            "openai:gpt-4o",
            output_type=AI_SceneDescription,
            instrument=False,
            system_prompt="You are a voxel scene generator. Generate 3D scenes based on the user's prompt."
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
                            "content": json_str,
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
