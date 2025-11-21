import React, { Suspense, useState, useEffect } from 'react';
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
import ErrorBoundary from './ErrorBoundary'; // Import the ErrorBoundary
import "@copilotkit/react-ui/styles.css";

function VoxelApp() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);

  const { visibleMessages, isLoading } = useCopilotChat();

  useEffect(() => {
    if (!isLoading && visibleMessages.length > 0) {
      const lastMessage = visibleMessages[visibleMessages.length - 1];

      if (lastMessage.role === "assistant" && lastMessage.content) {
        try {
          const parsed = JSON.parse(lastMessage.content);

          if (parsed && Array.isArray(parsed.chunks)) {
            console.log("Valid scene data received, updating viewer...");
            setSceneData(parsed as SceneData);
          }
        } catch (e) {
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
    <ErrorBoundary>
      <CopilotKit runtimeUrl="http://localhost:8000/api/generate">
        <VoxelApp />
      </CopilotKit>
    </ErrorBoundary>
  );
}

export default App;