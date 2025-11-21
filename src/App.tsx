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
