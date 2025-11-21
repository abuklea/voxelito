// src/hooks/useVoxelWorld.ts
import { useState, useCallback } from 'react';
import { VoxelWorld } from '../lib/VoxelWorld';

export const useVoxelWorld = () => {
  const [voxelWorld, setVoxelWorld] = useState<VoxelWorld | null>(null);

  // Callback ref guarantees we capture the DOM element when it mounts
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      console.log("VoxelWorld: Container mounted, initializing engine...");
      const world = new VoxelWorld(node);
      setVoxelWorld(world);

      // Cleanup function when node is removed
      return () => {
        console.log("VoxelWorld: Disposing engine...");
        world.dispose();
      };
    }
  }, []);

  return { voxelWorld, ref };
};
