import { describe, it, expect } from 'vitest';
import { useVoxelStore, VoxelSelection } from './voxelStore';

describe('voxelStore', () => {
  it('should set and clear selected voxels', () => {
    const { setSelectedVoxels, clearSelection } = useVoxelStore.getState();

    // Initial state
    expect(Object.keys(useVoxelStore.getState().selectedVoxels)).toHaveLength(0);

    // Set selection
    const selection: VoxelSelection = { position: [10, 20, 30], chunkId: '0,0,0' };
    const key = "10,20,30";
    setSelectedVoxels({ [key]: selection });
    expect(useVoxelStore.getState().selectedVoxels[key]).toEqual(selection);

    // Clear selection
    clearSelection();
    expect(Object.keys(useVoxelStore.getState().selectedVoxels)).toHaveLength(0);
  });

  it('should add and remove voxel from selection', () => {
      const { addVoxelToSelection, removeVoxelFromSelection, clearSelection } = useVoxelStore.getState();
      clearSelection();

      const v1: VoxelSelection = { position: [1,1,1], chunkId: '0,0,0' };
      addVoxelToSelection(v1);
      expect(useVoxelStore.getState().selectedVoxels['1,1,1']).toEqual(v1);

      removeVoxelFromSelection([1,1,1]);
      expect(useVoxelStore.getState().selectedVoxels['1,1,1']).toBeUndefined();
  });
});
