import { useEffect, useState, RefObject } from 'react';
import { VoxelWorld } from '../lib/VoxelWorld';

export const useVoxelWorld = (ref: RefObject<HTMLDivElement>) => {
  const [voxelWorld, setVoxelWorld] = useState<VoxelWorld | null>(null);

  useEffect(() => {
    if (ref.current) {
      const world = new VoxelWorld(ref.current);
      setVoxelWorld(world);

      return () => {
        world.dispose();
      };
    }
  }, [ref]);

  return voxelWorld;
};
