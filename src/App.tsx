import React, { Suspense } from 'react';
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
    <CopilotKit runtimeUrl="/api/generate">
      <div style={{ height: "100vh", width: "100vw" }}>
        <Viewer ref={ref} />
        <Suspense fallback={<div>Loading Voxel Engine...</div>}>
          {voxelWorld && sceneData && (
            <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
          )}
        </Suspense>
        <CopilotChat
          onSend={async (message) => {
            try {
              const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: message.prompt }),
              });

              if (!response.ok) {
                throw new Error('Network response was not ok');
              }

              const data = await response.json();

              // Scene update logic will be handled by a future tool
              console.log("Scene data received:", data);

            } catch (error) {
              console.error("Failed to generate scene:", error);
            }
          }}
        />
      </div>
    </CopilotKit>
  );
}

export default App;
