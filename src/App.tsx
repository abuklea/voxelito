import React, { Suspense } from 'react';
import type { SceneData, Voxel } from "./types";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';

// Test scene data to ensure something renders
const voxels: Voxel[] = [];
for (let x = 0; x < 1; x++) {
  for (let y = 0; y < 1; y++) {
    for (let z = 0; z < 1; z++) {
      voxels.push({
        position: [x, y, z],
        type: 'grass',
      });
    }
  }
}

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
      <Suspense fallback={<div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>Loading Voxel Engine...</div>}>
        {voxelWorld && (
          <SceneManager sceneData={testScene} voxelWorld={voxelWorld} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
