// src/hooks/useVoxelWorld.ts
import { useState, useCallback, useEffect } from 'react';
import { VoxelWorld } from '../lib/VoxelWorld';

/**
 * Custom hook to manage the lifecycle of the VoxelWorld instance.
 *
 * It provides a callback ref to attach to a DOM element, which triggers the initialization
 * of the VoxelWorld. It also handles the cleanup (disposal) of the world when the
 * component unmounts.
 *
 * @returns An object containing:
 * - `voxelWorld`: The active VoxelWorld instance or null.
 * - `ref`: A callback ref to attach to the container div.
 */
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
