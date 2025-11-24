import { create } from 'zustand';

/**
 * Represents a selected voxel's information.
 */
export interface VoxelSelection {
  /** The 3D coordinate of the selected voxel [x, y, z]. */
  position: [number, number, number];
  /** The ID of the chunk containing the voxel (e.g., "0,0,0"). */
  chunkId: string;
}

export type SelectionMode = 'replace' | 'add' | 'subtract';
export type SelectionTool = 'cursor' | 'box' | 'sphere';

/**
 * State definition for the Voxel Store.
 */
interface VoxelState {
  /** The currently selected voxels, keyed by "x,y,z". */
  selectedVoxels: Record<string, VoxelSelection>;
  /** Current selection mode. */
  selectionMode: SelectionMode;
  /** Current selection tool. */
  selectionTool: SelectionTool;
  /** Brush size for sphere/brush tools. */
  brushSize: number;
  /** Scene dimensions [x, y, z]. Default 250x250x250. */
  sceneSize: [number, number, number];

  /**
   * Sets the entire selection.
   * @param selection - The new selection map.
   */
  setSelectedVoxels: (selection: Record<string, VoxelSelection>) => void;

  /**
   * Adds a single voxel to the selection.
   * @param voxel - The voxel to add.
   */
  addVoxelToSelection: (voxel: VoxelSelection) => void;

  /**
   * Removes a single voxel from the selection.
   * @param position - The position to remove.
   */
  removeVoxelFromSelection: (position: [number, number, number]) => void;

  /** Sets the selection mode. */
  setSelectionMode: (mode: SelectionMode) => void;

  /** Sets the selection tool. */
  setSelectionTool: (tool: SelectionTool) => void;

  /** Sets the brush size. */
  setBrushSize: (size: number) => void;

  /** Sets the scene size. */
  setSceneSize: (size: [number, number, number]) => void;

  /** Clears the selection. */
  clearSelection: () => void;
}

/**
 * Global state store for voxel-related application state.
 * Uses Zustand for state management.
 */
export const useVoxelStore = create<VoxelState>((set) => ({
  selectedVoxels: {},
  selectionMode: 'replace',
  selectionTool: 'cursor',
  brushSize: 1,
  sceneSize: [250, 250, 250],

  setSelectedVoxels: (selection) => set({ selectedVoxels: selection }),

  addVoxelToSelection: (voxel) => set((state) => {
    const key = voxel.position.join(',');
    return { selectedVoxels: { ...state.selectedVoxels, [key]: voxel } };
  }),

  removeVoxelFromSelection: (pos) => set((state) => {
    const key = pos.join(',');
    const { [key]: _, ...rest } = state.selectedVoxels;
    return { selectedVoxels: rest };
  }),

  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSelectionTool: (tool) => set({ selectionTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setSceneSize: (size) => set({ sceneSize: size }),
  clearSelection: () => set({ selectedVoxels: {} }),
}));
