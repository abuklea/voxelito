import { useEffect, useRef, useCallback } from 'react';

interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
}

export const useVoxelMesher = (onMeshComplete: (chunkId: string, meshData: MeshData) => void) => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    console.log("Initializing voxel mesher worker...");
    workerRef.current = new Worker(new URL('/workers/greedy-mesher.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (event) => {
      console.log("Received message from worker:", event.data);
      const { chunkId, vertices, indices } = event.data;
      onMeshComplete(chunkId, { vertices, indices });
    };

    workerRef.current.onerror = (error) => {
      console.error("Error in voxel mesher worker:", error);
    };

    return () => {
      console.log("Terminating voxel mesher worker.");
      workerRef.current?.terminate();
    };
  }, [onMeshComplete]);

  const meshChunk = useCallback((chunkId: string, chunkData: Uint8Array, dimensions: [number, number, number]) => {
    if (workerRef.current) {
      console.log(`Sending chunk ${chunkId} to worker for meshing...`);
      workerRef.current.postMessage({
        chunkData,
        dimensions,
        chunkId,
      });
    }
  }, []);

  return { meshChunk };
};
