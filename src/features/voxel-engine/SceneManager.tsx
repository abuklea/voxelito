import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelMesher } from '../../hooks/useVoxelMesher';
import { VoxelWorld } from '../../lib/VoxelWorld';
import type { SceneData } from '../../types';
import { generateTextureAtlas, type TextureAtlasResult } from './TextureManager';
import { VoxelModel, CHUNK_SIZE } from '../../lib/VoxelModel';

interface SceneManagerProps {
  /** The data representing the scene, organized by chunks. */
  sceneData: SceneData;
  /** The VoxelWorld instance where meshes will be added/removed. */
  voxelWorld: VoxelWorld | null;
}

/**
 * React component responsible for managing the lifecycle of chunk meshes.
 * Utilizes VoxelModel for efficient data storage and dirty-checking.
 */
export const SceneManager: React.FC<SceneManagerProps> = ({ sceneData, voxelWorld }) => {
  const meshes = useRef<Record<string, THREE.Mesh>>({});
  const [atlasData, setAtlasData] = useState<TextureAtlasResult | null>(null);
  const voxelModel = useRef(new VoxelModel());

  useEffect(() => {
    generateTextureAtlas().then(setAtlasData);
  }, []);

  const material = useMemo(() => {
    if (!atlasData) return new THREE.MeshStandardMaterial({ color: 0x888888 });

    const mat = new THREE.MeshStandardMaterial({
      map: atlasData.texture,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    return mat;
  }, [atlasData]);

  const onMeshComplete = (chunkId: string, meshData: {
    vertices: Float32Array;
    indices: Uint32Array;
    voxelIds: Uint8Array;
  }) => {
    if (!voxelWorld || !atlasData) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));

    const uvs = new Float32Array(meshData.vertices.length / 3 * 2);

    for (let i = 0; i < meshData.voxelIds.length; i++) {
      const id = meshData.voxelIds[i];
      const uvInfo = atlasData.idToUV[id];

      if (uvInfo) {
          const { u, v, su, sv } = uvInfo;
          const vertexIndex = i % 4;

          let lu = 0, lv = 0;
          if (vertexIndex === 0) { lu = 0; lv = 0; }
          else if (vertexIndex === 1) { lu = 1; lv = 0; }
          else if (vertexIndex === 2) { lu = 1; lv = 1; }
          else if (vertexIndex === 3) { lu = 0; lv = 1; }

          uvs[i*2] = u + lu * su;
          uvs[i*2+1] = v + lv * sv;
      }
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    if (meshes.current[chunkId]) {
      voxelWorld.removeChunkMesh(chunkId, meshes.current[chunkId]);
      meshes.current[chunkId].geometry.dispose();
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const [x, y, z] = chunkId.split(',').map(Number);
    mesh.position.set(x * 32, y * 32, z * 32);
    meshes.current[chunkId] = mesh;
    voxelWorld.addChunkMesh(chunkId, mesh);
  };

  const { meshChunk } = useVoxelMesher(onMeshComplete);

  useEffect(() => {
    if (!sceneData || !sceneData.chunks || !atlasData) return;

    // Load data into model
    voxelModel.current.loadSceneData(sceneData, atlasData.typeToIds);

    // Clean up meshes that are not in the new scene data
    const activeChunkIds = new Set(sceneData.chunks.map(c => c.position.join(',')));
    if (voxelWorld) {
        for (const chunkId in meshes.current) {
          if (!activeChunkIds.has(chunkId)) {
            voxelWorld.removeChunkMesh(chunkId, meshes.current[chunkId]);
            meshes.current[chunkId].geometry.dispose();
            delete meshes.current[chunkId];
          }
        }
    }

    // Process dirty chunks
    voxelModel.current.dirtyChunks.forEach(chunkId => {
        const [cx, cy, cz] = chunkId.split(',').map(Number);
        const chunk = voxelModel.current.getChunk(cx, cy, cz);
        if (chunk) {
            meshChunk(chunkId, chunk, [CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE]);
        }
    });
    voxelModel.current.clearDirtyFlags();

  }, [sceneData, meshChunk, voxelWorld, atlasData]);

  return null;
};
