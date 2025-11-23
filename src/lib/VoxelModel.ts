import type { SceneData } from "../types";

export const CHUNK_SIZE = 32;

/**
 * Manages the raw voxel data using chunks of Uint8Arrays.
 * Optimized for memory and fast updates.
 */
export class VoxelModel {
  // Map chunk key "x,y,z" to Uint8Array(32*32*32)
  public chunks = new Map<string, Uint8Array>();
  // Set of chunk keys that need re-meshing
  public dirtyChunks = new Set<string>();

  getChunkKey(cx: number, cy: number, cz: number) {
    return `${cx},${cy},${cz}`;
  }

  getChunk(cx: number, cy: number, cz: number): Uint8Array | undefined {
    return this.chunks.get(this.getChunkKey(cx, cy, cz));
  }

  getOrCreateChunk(cx: number, cy: number, cz: number): Uint8Array {
    const key = this.getChunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  setVoxel(x: number, y: number, z: number, id: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);

    const chunk = this.getOrCreateChunk(cx, cy, cz);

    // Local coordinates inside the chunk
    const rx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ry = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const rz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    // Index mapping must match the worker / backend
    // Backend rasterize: index = rx + ry * SIZE + rz * SIZE * SIZE ??
    // Backend: index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
    // Wait, let's check greedy-mesher.worker.ts
    // Worker: chunkData[x + width * (y + height * z)]
    // x + 32 * (y + 32 * z)
    // = x + 32*y + 1024*z
    // Matches backend.

    const index = rx + CHUNK_SIZE * (ry + CHUNK_SIZE * rz);

    if (chunk[index] !== id) {
        chunk[index] = id;
        this.dirtyChunks.add(this.getChunkKey(cx, cy, cz));
    }
  }

  getVoxel(x: number, y: number, z: number): number {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);

    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return 0; // Air

    const rx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ry = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const rz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const index = rx + CHUNK_SIZE * (ry + CHUNK_SIZE * rz);

    return chunk[index];
  }

  /**
   * Loads scene data (RLE) into the model.
   * This overrides existing chunks if they exist in the data.
   */
  loadSceneData(sceneData: SceneData, atlasTypeToIds: Record<string, number[]>) {
      if (!sceneData.chunks) return;

      for (const chunkDef of sceneData.chunks) {
          const [cx, cy, cz] = chunkDef.position;
          const chunk = this.getOrCreateChunk(cx, cy, cz);

          chunk.fill(0); // Clear first (assuming RLE is full chunk or we want to reset)

          const localToGlobalVars = chunkDef.palette.map(p => {
              if (atlasTypeToIds[p]) return atlasTypeToIds[p];
              return [0];
          });

          let writeIndex = 0;
          if (chunkDef.rle_data) {
              const rleParts = chunkDef.rle_data.split(',');
              for (const part of rleParts) {
                  if (!part) continue;
                  const [localIdStr, countStr] = part.split(':');
                  const localId = parseInt(localIdStr, 10);
                  const count = parseInt(countStr, 10);

                  const variations = localToGlobalVars[localId];

                  if (writeIndex + count > chunk.length) break;

                  if (variations.length === 1 && variations[0] === 0) {
                      // Air / 0
                      // already filled 0 (but need to advance writeIndex)
                  } else {
                      for (let k = 0; k < count; k++) {
                          const idx = writeIndex + k;
                          // Deterministic hash for variation
                          const seed = idx + (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791);
                          const varIndex = Math.abs(seed) % variations.length;
                          chunk[idx] = variations[varIndex];
                      }
                  }
                  writeIndex += count;
              }
          }
          this.dirtyChunks.add(this.getChunkKey(cx, cy, cz));
      }
  }

  /**
   * Clears the dirty chunks set (call after meshing).
   */
  clearDirtyFlags() {
      this.dirtyChunks.clear();
  }
}
