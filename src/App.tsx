import React, { useRef } from 'react';
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { SceneData, Voxel } from "./features/voxel-engine/types";
import { useVoxelWorld } from './hooks/useVoxelWorld';

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
  const viewerRef = useRef<HTMLDivElement>(null);
  const voxelWorld = useVoxelWorld(viewerRef);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Viewer ref={viewerRef} />
      <SceneManager sceneData={testScene} voxelWorld={voxelWorld} />
    </div>
  );
}

export default App;
