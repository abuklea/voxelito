export type VoxelType = "air" | "grass" | "stone" | "dirt";

export interface Voxel {
  type: VoxelType;
}

export interface Chunk {
  position: [number, number, number];
  voxels: Voxel[];
}

export interface SceneData {
  chunks: Chunk[];
}

export type VoxelPalette = Record<VoxelType, { color: string }>;
