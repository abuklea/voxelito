export type VoxelType =
  | "air"
  | "grass"
  | "stone"
  | "dirt"
  | "water"
  | "wood"
  | "leaves"
  | "sand"
  | "brick"
  | "roof"
  | "glass"
  | "plank"
  | "concrete"
  | "asphalt"
  | "road_white"
  | "road_yellow"
  | "neon_blue"
  | "neon_pink"
  | "metal"
  | "snow"
  | "lava";

export interface Voxel {
  type: VoxelType;
}

export interface Chunk {
  position: [number, number, number];
  rle_data: string;
  palette: string[];
}

export interface SceneData {
  chunks: Chunk[];
}

export interface VoxelChunkData {
  chunkData: Uint8Array;
  dimensions: [number, number, number];
  chunkId: string;
}

export type VoxelPalette = Record<VoxelType, { color: string }>;
