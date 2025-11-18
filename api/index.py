from fastapi import FastAPI, Request, Response
from pydantic_ai.agent import Agent
from pydantic_ai.ui.ag_ui import AGUIAdapter

# A simple Pydantic-AI agent
agent = Agent()

app = FastAPI()

@app.post("/api/generate")
async def run_agent(request: Request) -> Response:
    """
    Handles the agent execution request and returns a streaming response.
    """
    return await AGUIAdapter.dispatch_request(request, agent=agent)
