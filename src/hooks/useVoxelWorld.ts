// src/hooks/useVoxelWorld.ts
import { useState, useCallback, useEffect } from 'react';
import { VoxelWorld } from '../lib/VoxelWorld';

export const useVoxelWorld = () => {
  const [voxelWorld, setVoxelWorld] = useState<VoxelWorld | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      console.log("VoxelWorld: Container mounted, initializing engine...");
      const world = new VoxelWorld(node);
      setVoxelWorld(world);
    }
  }, []);

  // useEffect for cleanup
  useEffect(() => {
    // This function will be called when the component unmounts
    return () => {
      if (voxelWorld) {
        console.log("VoxelWorld: Disposing engine...");
        voxelWorld.dispose();
      }
    };
  }, [voxelWorld]);

  return { voxelWorld, ref };
};
