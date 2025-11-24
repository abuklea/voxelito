import { describe, it, expect } from 'vitest';
import { greedyMesh } from './greedy-mesher.worker';

describe('GreedyMesher', () => {
    const SIZE = 32;

    function createEmptyChunk(): Uint8Array {
        return new Uint8Array(SIZE * SIZE * SIZE);
    }

    function setVoxel(chunk: Uint8Array, x: number, y: number, z: number, id: number) {
        chunk[x + SIZE * (y + SIZE * z)] = id;
    }

    it('returns empty mesh for empty chunk', () => {
        const chunk = createEmptyChunk();
        const result = greedyMesh(chunk, [SIZE, SIZE, SIZE]);

        expect(result.vertices.length).toBe(0);
        expect(result.indices.length).toBe(0);
        expect(result.voxelIds.length).toBe(0);
    });

    it('meshes a single voxel', () => {
        const chunk = createEmptyChunk();
        setVoxel(chunk, 1, 1, 1, 1);
        const result = greedyMesh(chunk, [SIZE, SIZE, SIZE]);

        // A single voxel has 6 faces. Each face is a quad (2 triangles).
        // Vertices per face: 4. Total vertices: 24.
        // Indices per face: 6. Total indices: 36.
        expect(result.vertices.length / 3).toBe(24); // 3 coords per vertex
        expect(result.indices.length).toBe(36);
        expect(result.voxelIds.length).toBe(24);
    });

    it('merges adjacent voxels of same type', () => {
        const chunk = createEmptyChunk();
        setVoxel(chunk, 0, 0, 0, 1);
        setVoxel(chunk, 1, 0, 0, 1);

        const result = greedyMesh(chunk, [SIZE, SIZE, SIZE]);

        // 2 voxels side-by-side.
        // Faces:
        // Top: merged (1 quad)
        // Bottom: merged (1 quad)
        // Front: merged (1 quad)
        // Back: merged (1 quad)
        // Left: 1 quad
        // Right: 1 quad
        // Total faces: 6.
        // Same as single voxel in terms of face count, just different dimensions.

        expect(result.vertices.length / 3).toBe(24);
        expect(result.indices.length).toBe(36);
    });

    it('does not merge adjacent voxels of different types', () => {
        const chunk = createEmptyChunk();
        setVoxel(chunk, 0, 0, 0, 1);
        setVoxel(chunk, 1, 0, 0, 2);

        const result = greedyMesh(chunk, [SIZE, SIZE, SIZE]);

        // Should have faces between them.
        // Left voxel (1) has right face.
        // Right voxel (2) has left face.
        // So they shouldn't share faces in the middle?
        // Wait, the greedy mesher iterates over faces.
        // If we look at the face between x=0 and x=1.
        // From x=0 looking +x: we see voxel 1.
        // From x=1 looking -x: we see voxel 2.

        // The loop `for (let d = 0; d < 3; ++d)` iterates directions.
        // It slices at x=-1, 0, 1...

        // At x=0 (between x=0 and x=1):
        // voxel1 = chunk[0], voxel2 = chunk[1].
        // voxel1=1, voxel2=2.
        // `if ((voxelType1 === 0) === (voxelType2 === 0))` -> false (both non-zero).
        // `else if (voxelType1 !== 0)` -> true. slice[n] = 1.
        // Wait, this logic seems to assume one is air.

        // Let's check logic:
        // if ((voxelType1 === 0) === (voxelType2 === 0))
        // If both are solid, this is true.
        // `slice[n++] = 0`.
        // So internal faces between two solid blocks are culled.

        // SO if they are different materials, the face between them is NOT rendered?
        // That is standard optimization for opaque blocks.
        // If so, then we expect merged faces on outside, but no face in between.

        // Top/Bottom/Front/Back are merged?
        // No, because they have different IDs.
        // The greedy meshing loop:
        // `while (i + w < dims[u] && slice[n + w] === voxelType)`
        // `voxelType` comes from slice.

        // For Top face (looking +y):
        // x=0 has ID 1. x=1 has ID 2.
        // Slice will show 1 then 2.
        // They won't merge.

        // So:
        // Top: 2 quads.
        // Bottom: 2 quads.
        // Front: 2 quads.
        // Back: 2 quads.
        // Left (of x=0): 1 quad.
        // Right (of x=1): 1 quad.
        // Total: 10 quads.
        // 10 * 4 = 40 vertices.
        // 10 * 6 = 60 indices.

        expect(result.vertices.length / 3).toBe(40);
        expect(result.indices.length).toBe(60);
    });
});
