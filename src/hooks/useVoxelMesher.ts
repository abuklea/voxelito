import { useEffect, useRef, useCallback } from 'react';

/**
 * Data structure returned by the meshing worker.
 */
interface MeshData {
  /** Flat array of vertex coordinates. */
  vertices: Float32Array;
  /** Flat array of vertex indices. */
  indices: Uint32Array;
  /** Array of voxel IDs corresponding to the vertices/quads. */
  voxelIds: Uint8Array;
}

/**
 * Custom hook to manage the Greedy Meshing Web Worker.
 *
 * This hook initializes the worker, handles incoming mesh data, and provides a function
 * to send chunk data to the worker for processing.
 *
 * @param onMeshComplete - Callback function triggered when the worker finishes meshing a chunk.
 * @returns An object containing the `meshChunk` function.
 */
export const useVoxelMesher = (onMeshComplete: (chunkId: string, meshData: MeshData) => void) => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    console.log("Initializing voxel mesher worker...");
    workerRef.current = new Worker(new URL('../workers/greedy-mesher.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (event) => {
      // console.log("Received message from worker:", event.data);
      const { chunkId, vertices, indices, voxelIds } = event.data;
      onMeshComplete(chunkId, { vertices, indices, voxelIds });
    };

    workerRef.current.onerror = (error) => {
      console.error("Error in voxel mesher worker:", error);
    };

    return () => {
      console.log("Terminating voxel mesher worker.");
      workerRef.current?.terminate();
    };
  }, [onMeshComplete]);

  /**
   * Sends a chunk of voxel data to the worker for meshing.
   *
   * @param chunkId - Unique identifier for the chunk.
   * @param chunkData - Flat Uint8Array of voxel IDs.
   * @param dimensions - Dimensions of the chunk [width, height, depth].
   */
  const meshChunk = useCallback((chunkId: string, chunkData: Uint8Array, dimensions: [number, number, number]) => {
    if (workerRef.current) {
      // console.log(`Sending chunk ${chunkId} to worker for meshing...`);
      workerRef.current.postMessage({
        chunkData,
        dimensions,
        chunkId,
      });
    }
  }, []);

  return { meshChunk };
};
