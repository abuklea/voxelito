# Problem Report: `CopilotKit` Integration Failure

**Date:** 2025-11-20
**Author:** Jules

## 1. Executive Summary

The initial task (P3S11) was to resolve two critical bugs preventing the application from rendering a 3D scene: a TypeScript import error causing a runtime crash, and a React race condition causing a blank screen.

**These core rendering bugs have been successfully fixed.** The application's 3D engine is now stable and can correctly render scenes from hardcoded data.

However, a significant and persistent secondary issue prevents the `CopilotKit` chat functionality from working. Despite extensive debugging on both the frontend and backend, the chat UI fails to initialize, blocking the full chat-to-scene user workflow. This report details the successful fixes, the unresolved chat issue, all debugging steps taken, and provides a clear path for a developer to continue the investigation.

The codebase has been reverted to a stable, working state that demonstrates the successful rendering fix, with the non-functional chat components removed.

## 2. Unresolved Issue: Silent `CopilotKit` Initialization Failure

### 2.1. Problem Definition

The application fails to render the `CopilotKit` chat button and interface, even though the underlying 3D canvas and the backend API are functioning correctly. The failure is silent—there are no errors in the browser console or the Vite development server logs.

### 2.2. Observed Behavior

- The Playwright verification script consistently times out while waiting for the chat button to appear: `waiting for get_by_role("button", name="CopilotKit")`.
- The backend API successfully receives and responds to the initial `availableAgents` discovery query from the `CopilotKit` frontend with a `200 OK` status.
- The 3D viewer canvas renders correctly in the background.

### 2.3. Suspected Root Cause

The root cause is likely a subtle configuration issue or an internal error within the `@copilotkit/react-core` and `@copilotkit/react-ui` components that is not being surfaced as a catchable error. The debugging process has ruled out obvious causes like server connectivity, code syntax errors, and incorrect API responses.

## 3. Chronological Debugging Log

The following is a detailed log of the steps taken to diagnose and resolve the issues.

**Step 1: Initial State - Rendering Bugs**
- **Action:** Implemented fixes for the rendering race condition (`useVoxelWorld.ts`) and TypeScript type-only imports.
- **Result:** Successfully rendered a hardcoded test scene. **This part of the task was a success.**

**Step 2: Re-integrating the Chat UI**
- **Action:** Restored the original `App.tsx` containing the `<CopilotKit>` components.
- **Error:** Playwright failed, `waiting for locator("canvas")`. The entire app was now blank.
- **Diagnosis:** Restoring the file reintroduced a bug. A missing `useState` import in `App.tsx` was crashing the application.
- **Fix:** Added the `useState` import.

**Step 3: Backend Connection Failure**
- **Action:** Re-ran verification script after fixing the import.
- **Error:** `ECONNREFUSED` in the browser console when trying to connect to `/api/generate`.
- **Diagnosis:** The Python backend server was not running.
- **Fix:** Installed Python dependencies (`pip install -r api/requirements.txt`) and started the `uvicorn` server.

**Step 4: Backend Rejects Initial Request**
- **Action:** Re-ran verification with both frontend and backend servers active.
- **Error:** Playwright timed out waiting for the `CopilotKit` button. The backend log showed a `400 Bad Request`.
- **Diagnosis:** The backend logic expected a `prompt` but was receiving a different payload from `CopilotKit` on initialization.
- **Fix:** Added logging to `api/index.py` to inspect the incoming request body.

**Step 5: Handling the `availableAgents` Query**
- **Action:** Re-ran verification to capture the log.
- **Log Data:** The initial request was a GraphQL query: `{'operationName': 'availableAgents', ...}`.
- **Diagnosis:** The `CopilotKit` frontend performs a discovery query on startup, which the backend must handle.
- **Fix:** Modified `api/index.py` to detect the `availableAgents` query and return a static JSON response describing the scene generation agent.

**Step 6: Investigating `ClientDisconnect`**
- **Action:** Re-ran verification with the discovery fix in place.
- **Error:** Playwright still timed out. The backend log now showed a `200 OK` for the discovery query, immediately followed by a `starlette.requests.ClientDisconnect` error.
- **Diagnosis:** The `CopilotKit` framework likely expects a persistent streaming connection (Server-Sent Events), not a simple request/response.
- **Fix:** Rewrote `api/index.py` to use a unified `StreamingResponse` that would handle both the discovery query and the subsequent prompt in a single, open connection.

**Step 7: Final Frontend Configuration**
- **Action:** Re-ran verification with the new streaming backend.
- **Error:** Playwright still timed out.
- **Diagnosis:** The issue was now almost certainly a client-side configuration problem.
- **Fix:** Made two critical changes to `src/App.tsx`:
    1.  Changed the `runtimeUrl` to an absolute path (`http://localhost:8000/api/generate`) to prevent any proxying issues.
    2.  Removed the custom `onSend` handler from `<CopilotChat>`, as it was likely conflicting with the main `CopilotKit` runtime.

**Step 8: Final State - Unresolved**
- **Action:** Restarted all servers and re-ran the verification script.
- **Error:** The script still times out waiting for the `CopilotKit` button. **This is the final, unresolved state of the issue.**

## 4. Final Code ("Should Work" Version)

The following code represents the most complete and "correct" state achieved during debugging.

### `src/App.tsx` (Frontend)
```tsx
import React, { Suspense, useState } from 'react';
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
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

### `api/index.py` (Backend)
```python
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
            # ... (instructions) ...
        )
    return None

app = FastAPI()

# --- Streaming Logic ---
async def stream_handler(request: Request):
    try:
        body = await request.json()

        # Case 1: CopilotKit discovery query
        if body.get("operationName") == "availableAgents":
            discovery_data = { "data": { "availableAgents": { "agents": [{ "name": "Voxel Scene Generator", ... }] } } }
            yield f"data: {json.dumps(discovery_data)}\n\n"
            return

        # Case 2: Scene generation prompt
        prompt = ""
        # ... (logic to extract prompt from messages) ...

        if not prompt:
            # ... (handle error) ...
            return

        agent = get_agent()
        # ... (handle agent errors) ...

        result = agent.run(prompt)
        scene_data = result.output.scene.dict()
        yield f"data: {json.dumps(scene_data)}\n\n"

    except Exception as e:
        # ... (handle exceptions) ...
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/generate")
async def run_agent_custom(request: Request) -> Response:
    return StreamingResponse(stream_handler(request), media_type="text/event-stream")
```

## 5. How to Reproduce the Error

1.  Ensure all dependencies are installed: `npm install` and `pip install -r api/requirements.txt`.
2.  Ensure a valid `OPENAI_API_KEY` is set in an `api/.env.local` file.
3.  Start the frontend server: `npm run dev`.
4.  Start the backend server: `uvicorn api.index:app --port 8000`.
5.  Open the application in a browser at `http://localhost:5173`.
6.  Observe that the 3D viewer appears but the chat button does not. Check the browser console and network tab for details.

## 6. Recommended Next Steps

1.  **Isolate `CopilotKit`:** Create a new, minimal React application (`create-vite-app`) and install only the `@copilotkit` packages. Attempt to render the basic `<CopilotKit>` and `<CopilotChat>` components pointing to the existing backend. This will determine if the issue is a conflict with another library in the main project.
2.  **Inspect Network Stream:** Use the browser's developer tools to inspect the `generate` request in the Network tab. Check the "EventStream" or "Response" tab to see if the streaming data from the backend is being received and if it is correctly formatted.
3.  **Consult `CopilotKit` Documentation:** Thoroughly review the official documentation for any required props, CSS imports, or provider components that may have been missed. The issue could be a simple misconfiguration.
4.  **Add Frontend Error Boundaries:** Wrap the `<CopilotKit>` component in a React Error Boundary to catch any potential rendering errors that are being suppressed internally.
