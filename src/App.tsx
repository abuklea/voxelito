import React, { Suspense } from 'react';
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { Voxel, SceneData } from './types';
import "@copilotkit/react-ui/styles.css";

const voxels: Voxel[] = new Array(32 * 32 * 32).fill({ type: "air" });
voxels[0] = { type: "stone" };

const testScene: SceneData = {
  chunks: [
    {
      position: [0, 0, 0],
      voxels: voxels,
    },
  ],
};

function App() {
  const { voxelWorld, ref } = useVoxelWorld();

  return (
    <CopilotKit runtimeUrl="/api/generate">
      <div style={{ height: "100vh", width: "100vw" }}>
        <Viewer ref={ref} />
        <Suspense fallback={<div>Loading Voxel Engine...</div>}>
          {voxelWorld && (
            <SceneManager sceneData={testScene} voxelWorld={voxelWorld} />
          )}
        </Suspense>
        <CopilotChat />
      </div>
    </CopilotKit>
  );
}

export default App;
