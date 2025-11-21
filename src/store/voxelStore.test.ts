import { describe, it, expect } from 'vitest';
import { useVoxelStore } from './voxelStore';

describe('voxelStore', () => {
  it('should set and clear selected voxel', () => {
    const { setSelectedVoxel } = useVoxelStore.getState();

    // Initial state
    expect(useVoxelStore.getState().selectedVoxel).toBeNull();

    // Set selection
    const selection = { position: [10, 20, 30] as [number, number, number], chunkId: '0,0,0' };
    setSelectedVoxel(selection);
    expect(useVoxelStore.getState().selectedVoxel).toEqual(selection);

    // Clear selection
    setSelectedVoxel(null);
    expect(useVoxelStore.getState().selectedVoxel).toBeNull();
  });
});
