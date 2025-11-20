import React, { Suspense } from 'react';
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import { Voxel, SceneData } from './types';

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
    <div style={{ height: "100vh", width: "100vw" }}>
      <Viewer ref={ref} />
      <Suspense fallback={<div>Loading Voxel Engine...</div>}>
        {voxelWorld && (
          <SceneManager sceneData={testScene} voxelWorld={voxelWorld} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
