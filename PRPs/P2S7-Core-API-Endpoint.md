name: "P2S7 Core API Endpoint"
description: |
  PRP for the implementation of the core API endpoint for Phase 2, Step 7 of the project. This PRP provides the context and plan for implementing the `/api/generate` endpoint in the FastAPI application.

## Purpose
This document provides a detailed plan for implementing the `/api/generate` endpoint, which will handle requests from the `ag-ui` frontend, pass them to a `pydantic-ai` agent, and stream events back to the client in accordance with the `ag-ui` protocol.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
The goal of this PRP is to implement the `POST /api/generate` endpoint in the FastAPI application. This endpoint will serve as the primary communication channel between the frontend and the AI agent.

## Why
- This endpoint is critical for the application to function, as it allows the frontend to send user prompts to the AI agent.
- It will enable the application to generate
- This will allow the application to be used by users to generate 3D voxel scenes.

## What
The `/api/generate` endpoint will be a `POST` endpoint that accepts a request from the `ag-ui` frontend. It will then pass the request to a `pydantic-ai` agent and stream the response back to the client.

### Success Criteria
- [ ] The `/api/generate` endpoint is implemented in `api/index.py`.
- [ ] The endpoint successfully receives requests from the `ag-ui` frontend.
- [ ] The endpoint passes the request to a `pydantic-ai` agent.
- [ ] The endpoint streams the response back to the client in accordance with the `ag-ui` protocol.

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://ai.pydantic.dev/ui/ag-ui/
  why: Official documentation for the AG-UI protocol and the `AGUIAdapter`.
- file: api/index.py
  why: The file where the endpoint will be implemented.
```

### Current Codebase tree
```bash
.
├── PRPs
│   ├── P2S7-Core-API-Endpoint.md
├── api
│   ├── __pycache__
│   │   └── index.cpython-311.pyc
│   ├── index.py
│   └── requirements.txt
├── docs
│   ├── 00_BRIEF.md
│   ├── 01_MVP.md
│   ├── 02_STORIES.md
│   ├── 03_STYLE.md
│   ├── 04_UI.md
│   ├── 05_TECH.md
│   └── 06_PLAN.md
├── public
│   └── vite.svg
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
.
├── api
│   ├── __pycache__
│   │   └── index.cpython-311.pyc
│   ├── index.py # The endpoint will be implemented here
│   └── requirements.txt
```

### Known Gotchas of our codebase & Library Quirks
```python
# CRITICAL: FastAPI requires async functions for endpoints
# CRITICAL: The `AGUIAdapter` handles the request and response streaming
```

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
MODIFY api/index.py:
  - REMOVE the existing implementation of the `/api/generate` endpoint.
  - IMPLEMENT the `/api/generate` endpoint to handle requests from the `ag-ui` frontend, pass them to a `pydantic-ai` agent, and stream events back to the client in accordance with the `ag-ui` protocol.
```

### Per task pseudocode as needed added to each task
```python
# Task 1
# Pseudocode with CRITICAL details dont write entire code
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
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
ruff check api/index.py --fix
mypy api/index.py

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests each new feature/file/function use existing test patterns
```python
# No unit tests will be written for this feature at this time.
```

### Level 3: Integration Test
```bash
# Start the service
uvicorn api.index:app --reload

# Test the endpoint by running the frontend and sending a request to the endpoint.
```

## Final validation Checklist
- [ ] No linting errors: `ruff check api/`
- [ ] No type errors: `mypy api/`
- [ ] Manual test successful by running the frontend and sending a request to the endpoint.
- [ ] Error cases handled gracefully
- [ ] Logs are informative but not verbose

---

## Anti-Patterns to Avoid
- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation because "it should work"
- ❌ Don't ignore failing tests - fix them
- ❌ Don't use sync functions in async context
- ❌ Don't hardcode values that should be config
- ❌ Don't catch all exceptions - be specific
