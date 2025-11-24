import { describe, it, expect, beforeEach } from 'vitest';
import { VoxelModel, CHUNK_SIZE } from './VoxelModel';
import type { SceneData } from '../types';

describe('VoxelModel', () => {
  let model: VoxelModel;

  beforeEach(() => {
    model = new VoxelModel();
  });

  it('generates correct chunk keys', () => {
    expect(model.getChunkKey(1, -2, 3)).toBe('1,-2,3');
    expect(model.getChunkKey(0, 0, 0)).toBe('0,0,0');
  });

  it('sets and gets voxels correctly within a chunk', () => {
    model.setVoxel(10, 10, 10, 5);
    expect(model.getVoxel(10, 10, 10)).toBe(5);
    expect(model.getVoxel(11, 10, 10)).toBe(0); // Default air
  });

  it('sets and gets voxels across chunk boundaries', () => {
    // 32 is start of next chunk in positive direction
    model.setVoxel(32, 0, 0, 1);
    expect(model.getChunk(1, 0, 0)).toBeDefined();
    expect(model.getVoxel(32, 0, 0)).toBe(1);

    // Negative coordinates
    model.setVoxel(-1, 0, 0, 2);
    // -1 is in chunk -1
    expect(model.getChunk(-1, 0, 0)).toBeDefined();
    expect(model.getVoxel(-1, 0, 0)).toBe(2);
  });

  it('marks chunks as dirty when modified', () => {
    expect(model.dirtyChunks.size).toBe(0);
    model.setVoxel(5, 5, 5, 1);
    expect(model.dirtyChunks.has('0,0,0')).toBe(true);

    model.clearDirtyFlags();
    expect(model.dirtyChunks.size).toBe(0);
  });

  it('does not mark dirty if value is same', () => {
    model.setVoxel(5, 5, 5, 1);
    model.clearDirtyFlags();

    model.setVoxel(5, 5, 5, 1);
    expect(model.dirtyChunks.size).toBe(0);
  });

  it('loads scene data correctly', () => {
    const sceneData: SceneData = {
      chunks: [
        {
          position: [0, 0, 0],
          palette: ['air', 'stone'], // 0 -> air, 1 -> stone
          rle_data: '1:10,0:5,1:2' // 10 stones, 5 airs, 2 stones
        }
      ]
    };

    const atlasMap: Record<string, number[]> = {
      'air': [0],
      'stone': [42]
    };

    model.loadSceneData(sceneData, atlasMap);

    expect(model.chunks.has('0,0,0')).toBe(true);
    const chunk = model.chunks.get('0,0,0')!;

    // Check first 10 voxels are stone (42)
    for (let i = 0; i < 10; i++) {
        expect(chunk[i]).toBe(42);
    }
    // Check next 5 are air (0)
    for (let i = 10; i < 15; i++) {
        expect(chunk[i]).toBe(0);
    }
    // Check next 2 are stone (42)
    for (let i = 15; i < 17; i++) {
        expect(chunk[i]).toBe(42);
    }

    // Check dirty flag
    expect(model.dirtyChunks.has('0,0,0')).toBe(true);
  });
});
