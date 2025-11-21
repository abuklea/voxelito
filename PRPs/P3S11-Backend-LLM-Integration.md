name: "P3S11 - Backend LLM Integration"
description: |
  This PRP outlines the process of integrating a real Large Language Model (LLM) into the backend service. This involves connecting to the OpenAI API, managing API keys securely, and defining the structured data models for generating voxel scenes.

## Goal
Integrate an OpenAI LLM with the `pydantic-ai` agent in the backend to generate structured voxel scene data from user prompts.

## Why
- This is a core feature of the application, enabling the translation of natural language descriptions into 3D scenes.
- It moves the application from a mocked backend to a functional AI-powered service.

## What
- The backend API will be updated to use an OpenAI model (e.g., `gpt-4o`).
- API key management will be implemented using environment variables.
- Pydantic models will be defined to structure the LLM's output into a `VoxelScene` format.

### Success Criteria
- [ ] The `pydantic-ai` agent successfully connects to the OpenAI API.
- [ ] The backend responds with structured `VoxelScene` data when prompted.
- [ ] The API key is loaded securely from an environment variable and is not hardcoded.

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://ai.pydantic.dev/
  why: "The official Pydantic AI documentation, providing examples for LLM integration."
- file: api/index.py
  why: "The current state of the backend API, which needs to be modified."
- file: src/types.ts
  why: "Contains the frontend's definition of VoxelScene, which the backend needs to replicate in Pydantic."
```

### Current Codebase tree
```bash
.
├── PRPs
├── api
│   ├── __pycache__
│   ├── index.py
│   └── requirements.txt
├── docs
├── public
├── src
│   ├── App.tsx
│   ├── assets
│   ├── components
│   ├── features
│   ├── hooks
│   ├── lib
│   └── types.ts
├── .env.local
├── .gitignore
├── README.md
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
.
├── api
│   ├── .env.local  # For storing the OpenAI API key
│   ├── index.py    # Updated to include LLM integration logic
│   └── requirements.txt # Updated to include openai dependency
...
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: The OpenAI API key must be managed via environment variables and not be exposed in the source code.
# The `python-dotenv` library is useful for loading environment variables from a `.env` file during local development.
# Pydantic models used for output must exactly match the structure expected by the frontend to avoid data mismatches.
```

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
CREATE .env.local:
  - Add the `OPENAI_API_KEY` to this file.

Task 2:
MODIFY api/requirements.txt:
  - Add `pydantic-ai[openai]` to install the necessary client libraries.
  - Add `python-dotenv` for loading the environment file.

Task 3:
MODIFY api/index.py:
  - Import necessary libraries: `os`, `dotenv`, `pydantic`.
  - Load environment variables using `dotenv.load_dotenv()`.
  - Define Pydantic models for `Voxel`, `VoxelScene`, and `AI_SceneDescription` that mirror the TypeScript types.
  - Instantiate the `pydantic_ai.Agent` with an OpenAI model and the structured output type.
  - Update the agent's instructions to guide it in generating voxel scenes.

```

### Per task pseudocode as needed added to each task

```python
# Task 3: api/index.py

import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.ui.ag_ui import AGUIAdapter
from fastapi import FastAPI, Request, Response

# Load environment variables from .env.local
load_dotenv()

# Ensure the OpenAI API key is set
if "OPENAI_API_KEY" not in os.environ:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment.")

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


# Instantiate the agent with the OpenAI LLM and structured output
agent = Agent(
    "openai:gpt-4o",
    output_type=AI_SceneDescription,
    instructions=[
        "You are a helpful assistant that generates 3D voxel scenes based on user descriptions.",
        "Generate a scene that matches the user's request.",
        "The origin (0,0,0) is at the center of the base.",
        "The y-axis is vertical."
    ],
)

app = FastAPI()

@app.post("/api/generate")
async def run_agent(request: Request) -> Response:
    """
    Handles the agent execution request and returns a streaming response.
    """
    return await AGUIAdapter.dispatch_request(request, agent=agent)

```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Not applicable for this project's Python setup. Manual code review for style.
```

### Level 2: Unit Tests
```bash
# No unit tests are set up for the Python backend yet. Manual testing will be required.
```

### Level 3: Integration Test
```bash
# Start the service
uvicorn api.index:app --port 8000

# Test the endpoint from a separate terminal
# Note: This is a conceptual test. The actual test will be done via the frontend UI.
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create a small red cube"}'

# Expected: A streaming response containing JSON data that conforms to the AI_SceneDescription model.
```

## Final validation Checklist
- [ ] `api/requirements.txt` is updated with `pydantic-ai[openai]` and `python-dotenv`.
- [ ] `.env.local` is created and contains the `OPENAI_API_KEY`.
- [ ] `api/index.py` is updated to load the API key and instantiate the agent with an OpenAI model.
- [ ] The backend server starts without errors.
- [ ] The `/api/generate` endpoint responds with structured data when prompted through the application's UI.

---

## Anti-Patterns to Avoid
- ❌ Don't hardcode the API key in the source code.
- ❌ Don't create Pydantic models that are inconsistent with the frontend's TypeScript types.
- ❌ Don't commit the `.env.local` file to version control.
