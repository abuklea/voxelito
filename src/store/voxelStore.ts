import { create } from 'zustand';

interface VoxelSelection {
  position: [number, number, number]; // x, y, z
  chunkId: string; // "x,y,z"
}

interface VoxelState {
  selectedVoxel: VoxelSelection | null;
  setSelectedVoxel: (selection: VoxelSelection | null) => void;
}

export const useVoxelStore = create<VoxelState>((set) => ({
  selectedVoxel: null,
  setSelectedVoxel: (selection) => set({ selectedVoxel: selection }),
}));
