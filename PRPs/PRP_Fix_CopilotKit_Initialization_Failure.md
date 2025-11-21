# PRP: Fix CopilotKit Initialization Failure (Protocol Mismatch)

## 1. Context and Problem
The `Voxelito` application has successfully resolved its core 3D rendering issues, but the **CopilotKit Chat UI** fails to initialize.
*   **Symptoms:** The chat button does not appear. The Playwright verification script times out waiting for `get_by_role("button", name="CopilotKit")`.
*   **Current State:** The backend (`api/index.py`) is running and accessible. The frontend (`src/App.tsx`) is correctly configured to point to the backend.
*   **Error Log:** The backend reports a `ClientDisconnect` immediately after receiving the initial request.

## 2. Root Cause Analysis
The issue is a **Protocol Mismatch** between the `CopilotKit` frontend SDK and the custom Python backend.

1.  **Discovery Phase:** On initialization, the `CopilotKit` frontend sends a standard HTTP POST request with the body `{"operationName": "availableAgents", ...}`. It expects a standard **JSON response** (Content-Type: `application/json`).
2.  **Current Backend Behavior:** The current `api/index.py` wraps *all* responses in a `StreamingResponse` (Content-Type: `text/event-stream`), regardless of the request type.
3.  **The Failure:** When the browser receives the `text/event-stream` header for the discovery request, it detects a format mismatch (or the fetch client aborts), closing the connection immediately. This triggers the `ClientDisconnect` on the server and leaves the frontend in a silent error state, preventing the UI from mounting.

## 3. Proposed Solution
We must modify the backend entry point (`api/index.py`) to distinguish between the **Discovery Phase** and the **Chat Phase**.

*   **Discovery (`availableAgents`):** Must return a standard `JSONResponse`.
*   **Chat (`generate`):** Must return a `StreamingResponse` (Server-Sent Events).

## 4. Implementation Plan

### Step 1: Modify Backend Dependencies
Ensure `JSONResponse` is imported from `fastapi.responses`.

### Step 2: Refactor `api/index.py`
Rewrite the `run_agent_custom` endpoint to inspect the incoming request body *before* deciding on the response type.

**Required Logic:**
1.  Parse the request body as JSON.
2.  Check if `body.get("operationName") == "availableAgents"`.
3.  **If Match:** Return a `JSONResponse` containing the static agent definition.
4.  **If No Match:** Proceed to the `stream_handler` and return a `StreamingResponse`.

### Step 3: Verify Frontend Configuration
Ensure `src/App.tsx` includes the necessary CSS import to render the UI once the logic is fixed.

## 5. Detailed Code Changes

### File: `api/index.py`

```python
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from fastapi import FastAPI, Request
# [CHANGE 1] Import JSONResponse
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
                        "id": "voxel_agent"
                    }]
                }
            }
        }
        return JSONResponse(content=discovery_data)

    # [CHANGE 3] Handle Chat as Stream
    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
```

### File: `src/App.tsx`
Ensure the CSS import is present.

```tsx
import React, { Suspense, useState } from 'react';
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
// [CHECK] Ensure this import exists
import "@copilotkit/react-ui/styles.css";

function App() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);

  return (
    <CopilotKit runtimeUrl="http://localhost:8000/api/generate">
      <div style={{ height: "100vh", width: "100vw" }}>
        <Viewer ref={ref} />
        <Suspense fallback={<div>Loading Voxel Engine...</div>}>
          {voxelWorld && sceneData && (
            <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
          )}
        </Suspense>
        <CopilotChat />
      </div>
    </CopilotKit>
  );
}

export default App;
```

## 6. Verification Plan

1.  **Restart Servers:**
    *   Backend: `uvicorn api.index:app --port 8000 --reload`
    *   Frontend: `npm run dev`
2.  **Manual Verification:**
    *   Open `http://localhost:5173`.
    *   **Success Criteria:** The "CopilotKit" chat button (usually a sparkle icon or chat bubble) appears in the bottom right corner.
    *   Click the button to open the chat window.
3.  **Automated Verification:**
    *   Run the Playwright script provided in the repo.
    *   **Success Criteria:** The script passes the step `waiting for get_by_role("button", name="CopilotKit")`.