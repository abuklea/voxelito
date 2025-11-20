import { useState, useCallback } from 'react';
import { VoxelWorld } from '../lib/VoxelWorld';

export const useVoxelWorld = () => {
  const [voxelWorld, setVoxelWorld] = useState<VoxelWorld | null>(null);

  // Using a callback ref ensures code runs exactly when the DOM element is created
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      const world = new VoxelWorld(node);
      setVoxelWorld(world);

      // Cleanup when the node is removed
      return () => {
        world.dispose();
      };
    }
  }, []);

  return { voxelWorld, ref };
};
