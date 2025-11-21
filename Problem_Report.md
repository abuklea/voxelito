# Problem Report: `CopilotKit` Integration Failure

**Date:** 2025-11-21
**Author:** Jules

## 1. Executive Summary

The primary goal of this task was to fix the CopilotKit initialization failure, which was preventing the chat UI from appearing. The root cause was correctly identified as a protocol mismatch between the frontend and the Python backend. The backend was sending a `StreamingResponse` for all requests, while the frontend expected a `JSONResponse` for the initial `availableAgents` discovery query.

The backend has been successfully fixed to handle this dual-protocol requirement. It now correctly returns a `JSONResponse` for the discovery query and a `StreamingResponse` for chat messages. Additionally, CORS has been enabled on the backend to allow requests from the frontend development server.

On the frontend, the `App.tsx` component has been updated to use the `useCopilotAction` hook, which is responsible for handling the scene data streamed from the backend.

Despite these fixes, the Playwright verification script continues to fail. The script times out waiting for the CopilotKit chat button to appear, which indicates that the frontend is still not rendering the chat UI. The root cause of this failure is unknown, and it is suspected to be an issue within the CopilotKit library itself or a subtle configuration issue that has not been identified.

This report provides a complete summary of the work performed, the final state of the codebase, and all the debugging steps taken. The goal is to provide the next developer with all the information they need to continue the investigation and resolve the issue.

## 2. Unresolved Issue: Silent `CopilotKit` Initialization Failure

### 2.1. Problem Definition

The application fails to render the `CopilotKit` chat button and interface, even though the underlying 3D canvas and the backend API are functioning correctly. The failure is silent—there are no errors in the browser console or the Vite development server logs.

### 2.2. Observed Behavior

- The Playwright verification script consistently times out while waiting for the chat button to appear: `waiting for get_by_role("button", name="CopilotKit")`.
- The backend API successfully receives and responds to the initial `availableAgents` discovery query from the `CopilotKit` frontend with a `200 OK` status. The backend logs show that the correct `JSONResponse` is being sent.
- The 3D viewer canvas renders correctly in the background.

### 2.3. Suspected Root Cause

The root cause is likely a subtle configuration issue or an internal error within the `@copilotkit/react-core` and `@copilotkit/react-ui` components that is not being surfaced as a catchable error. The debugging process has ruled out the most obvious causes, including server connectivity, CORS, incorrect API responses, and missing `__typename` fields in the GraphQL response.

## 3. Chronological Debugging Log

The following is a detailed log of the steps taken to diagnose and resolve the issues.

**Step 1: Initial State - Protocol Mismatch**
- **Action:** Implemented the dual-protocol backend fix as described in the PRP.
- **Result:** The backend now correctly handles the `availableAgents` query.

**Step 2: CORS Error**
- **Action:** Ran the Playwright verification script.
- **Error:** The backend log showed a `405 Method Not Allowed` for an `OPTIONS` request.
- **Diagnosis:** The browser was sending a CORS preflight request that was being rejected by the backend.
- **Fix:** Added CORS middleware to the FastAPI application to allow requests from the frontend.

**Step 3: Missing `__typename` Fields**
- **Action:** Ran the Playwright verification script.
- **Error:** The script still timed out. The backend logs showed successful `OPTIONS` and `POST` requests.
- **Diagnosis:** The `availableAgents` response was missing the `__typename` fields, which are often required by GraphQL clients.
- **Fix:** Added the `__typename` fields to the `discovery_data` in `api/index.py`.

**Step 4: Incomplete Frontend Integration**
- **Action:** Requested a code review.
- **Feedback:** The backend fix was correct, but the frontend was not handling the data stream from the backend.
- **Fix:** Implemented the `useCopilotAction` hook in `src/App.tsx` to handle the scene data.

**Step 5: Final State - Unresolved**
- **Action:** Restarted all servers and re-ran the verification script.
- **Error:** The script still times out waiting for the `CopilotKit` button. **This is the final, unresolved state of the issue.**

## 4. Final Code

The following code represents the most complete and "correct" state of the application.

### `src/App.tsx` (Frontend)
```tsx
import React, { Suspense, useState } from 'react';
import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
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

  useCopilotAction({
    name: "updateScene",
    description: "Update the 3D voxel scene.",
    parameters: [
      {
        name: "scene",
        type: "object",
        description: "The scene data.",
        attributes: [
          {
            name: "chunks",
            type: "array",
            description: "The chunks of the scene.",
            attributes: [
              {
                name: "position",
                type: "array",
                description: "The position of the chunk.",
              },
              {
                name: "voxels",
                type: "array",
                description: "The voxels of the chunk.",
              },
            ],
          },
        ],
      },
    ],
    handler: async ({ scene }) => {
      setSceneData(scene);
    },
  });

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
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                        "id": "voxel_agent",
                        "__typename": "Agent"
                    }],
                    "__typename": "AvailableAgents"
                }
            }
        }
        return JSONResponse(content=discovery_data)

    # [CHANGE 3] Handle Chat as Stream
    return StreamingResponse(stream_handler(body), media_type="text/event-stream")
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
