# PRP: Implement Scene State Update via Chat Response

## 1. Context and Problem
*   **Current State:** The backend successfully generates a 3D scene and streams it to the frontend as a JSON string. The `CopilotChat` UI displays this raw JSON to the user as a text message.
*   **The Gap:** The application state (`sceneData`) is never updated with this data. Consequently, the 3D `Viewer` remains empty, even though the data has arrived in the chat window.
*   **Technical Constraint:** The current backend uses a custom Pydantic AI agent that outputs a direct JSON object. It does not currently support the complex OpenAI "Tool Calling" protocol required for `useCopilotAction`. Therefore, we must implement a **client-side listener** to bridge the chat response to the application state.

## 2. Proposed Solution
We will implement a "Message Listener" pattern in the frontend.

1.  **Hook into Chat State:** Use the `useCopilotChat` hook to access the message history and the loading state.
2.  **Detect Completion:** Watch for the moment the AI finishes generating a response (`isLoading` goes from `true` to `false`).
3.  **Parse & Validate:** Attempt to parse the last message from the assistant. If it contains valid `SceneData` (specifically a `chunks` array), we will automatically update the React state.
4.  **Update UI:** Calling `setSceneData` will trigger the `SceneManager` to render the voxels.

## 3. Implementation Plan

### Step 1: Update `src/App.tsx` Imports
Import `useCopilotChat` and `useEffect` (already imported).

### Step 2: Implement the Parsing Logic
Inside the `App` component, add the logic to listen to the chat messages.

**Logic Flow:**
1.  Get `visibleMessages` and `isLoading` from `useCopilotChat()`.
2.  In a `useEffect`, check if `!isLoading` and if we have messages.
3.  Get the last message. Check if it is from the `assistant`.
4.  Try `JSON.parse(message.content)`.
5.  Check if the parsed object has a `chunks` property.
6.  If valid, call `setSceneData(parsedObject)`.

## 4. Detailed Code Changes

### File: `src/App.tsx`

```tsx
import React, { Suspense, useState, useEffect } from 'react';
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core"; // [CHANGE] Import useCopilotChat
import { CopilotChat } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
import "@copilotkit/react-ui/styles.css";

// [CHANGE] Create a wrapper component to handle the logic
// We need a wrapper because useCopilotChat must be used *inside* CopilotKit provider
function VoxelApp() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);

  // [CHANGE] Hook into the chat context
  const { visibleMessages, isLoading } = useCopilotChat();

  // [CHANGE] Effect to parse JSON from the chat when generation finishes
  useEffect(() => {
    if (!isLoading && visibleMessages.length > 0) {
      const lastMessage = visibleMessages[visibleMessages.length - 1];

      // Ensure it's an assistant message
      if (lastMessage.role === "assistant" && lastMessage.content) {
        try {
          // Attempt to parse the content as JSON
          // Note: The backend sends "data: {json}", but CopilotKit parses the stream
          // and likely presents the content as the raw JSON string.
          const parsed = JSON.parse(lastMessage.content);

          // Basic validation to ensure it's our SceneData
          if (parsed && Array.isArray(parsed.chunks)) {
            console.log("Valid scene data received, updating viewer...");
            setSceneData(parsed as SceneData);
          }
        } catch (e) {
          // If it's not JSON (e.g. normal chat text), ignore it
          // console.debug("Last message was not valid JSON scene data");
        }
      }
    }
  }, [isLoading, visibleMessages]);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Viewer ref={ref} />
      <Suspense fallback={<div>Loading Voxel Engine...</div>}>
        {voxelWorld && sceneData && (
          <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
        )}
      </Suspense>
      <CopilotChat />
    </div>
  );
}

function App() {
  return (
    <CopilotKit runtimeUrl="http://localhost:8000/api/generate">
      <VoxelApp />
    </CopilotKit>
  );
}

export default App;
```

## 5. Verification Plan

1.  **Start the App:** Ensure backend (`uvicorn`) and frontend (`npm run dev`) are running.
2.  **Open Browser:** Go to `http://localhost:5173`.
3.  **Enter Prompt:** In the CopilotChat window, type: *"Generate a small tree with a brown trunk and green leaves."*
4.  **Observe Chat:**
    *   Wait for the response to stream in.
    *   You should see the raw JSON appear in the chat bubble.
5.  **Observe Viewer:**
    *   **Success Criteria:** Immediately after the chat finishes typing, the 3D viewer background should populate with the voxel tree.
6.  **Console Check:** Open the browser console (F12) and look for the log: `"Valid scene data received, updating viewer..."`.

## 6. Note on Future Improvements (`useCopilotAction`)
This solution is a robust intermediate step. The "Ideal" CopilotKit implementation involves using `useCopilotAction` to register a client-side tool. However, that requires the backend to support the **OpenAI Tool Calling Protocol** (emitting specific `tool_calls` structures instead of raw content). Given the current custom backend implementation, the parsing method above is the most reliable way to get the feature working immediately without a major backend rewrite.