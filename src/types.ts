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

export interface VoxelChunkData {
  chunkData: Uint8Array;
  dimensions: [number, number, number];
  chunkId: string;
}
