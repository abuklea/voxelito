import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelMesher } from '../../hooks/useVoxelMesher';
import { VoxelWorld } from '../../lib/VoxelWorld';
import type { SceneData, VoxelType } from '../../types';

const voxelTypeMap: Record<VoxelType, number> = {
  air: 0,
  grass: 1,
  stone: 2,
  dirt: 3,
};

interface SceneManagerProps {
  sceneData: SceneData;
  voxelWorld: VoxelWorld | null;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ sceneData, voxelWorld }) => {
  const meshes = useRef<Record<string, THREE.Mesh>>({});

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 'green',
  }), []);

  const onMeshComplete = (chunkId: string, meshData: {
    vertices: Float32Array;
    indices: Uint32Array;
  }) => {
    if (!voxelWorld) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    if (meshes.current[chunkId]) {
      voxelWorld.removeChunkMesh(chunkId, meshes.current[chunkId]);
      meshes.current[chunkId].geometry.dispose();
    }

    const mesh = new THREE.Mesh(geometry, material);
    const [x, y, z] = chunkId.split(',').map(Number);
    mesh.position.set(x * 32, y * 32, z * 32);
    meshes.current[chunkId] = mesh;
    voxelWorld.addChunkMesh(chunkId, mesh);
  };

  const { meshChunk } = useVoxelMesher(onMeshComplete);

  useEffect(() => {
    if (!sceneData || !sceneData.chunks) return;

    for (const chunk of sceneData.chunks) {
      const chunkId = chunk.position.join(',');
      const chunkData = new Uint8Array(32 * 32 * 32);
      for (let i = 0; i < chunk.voxels.length; i++) {
        chunkData[i] = voxelTypeMap[chunk.voxels[i].type];
      }
      meshChunk(chunkId, chunkData, [32, 32, 32]);
    }

    // Clean up old meshes
    return () => {
      if (voxelWorld) {
        for (const chunkId in meshes.current) {
          if (!sceneData.chunks.find(c => c.position.join(',') === chunkId)) {
            voxelWorld.removeChunkMesh(chunkId, meshes.current[chunkId]);
            meshes.current[chunkId].geometry.dispose();
            delete meshes.current[chunkId];
          }
        }
      }
    };
  }, [sceneData, meshChunk, voxelWorld]);

  return null; // This component does not render anything itself
};
