import { create } from 'zustand';

/**
 * Represents a selected voxel's information.
 */
interface VoxelSelection {
  /** The 3D coordinate of the selected voxel [x, y, z]. */
  position: [number, number, number];
  /** The ID of the chunk containing the voxel (e.g., "0,0,0"). */
  chunkId: string;
}

/**
 * State definition for the Voxel Store.
 */
interface VoxelState {
  /** The currently selected voxel, or null if none selected. */
  selectedVoxel: VoxelSelection | null;
  /**
   * Updates the currently selected voxel.
   * @param selection - The new selection or null to clear.
   */
  setSelectedVoxel: (selection: VoxelSelection | null) => void;
}

/**
 * Global state store for voxel-related application state.
 * Uses Zustand for state management.
 */
export const useVoxelStore = create<VoxelState>((set) => ({
  selectedVoxel: null,
  setSelectedVoxel: (selection) => set({ selectedVoxel: selection }),
}));
