import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelMesher } from '../../hooks/useVoxelMesher';
import { VoxelWorld } from '../../lib/VoxelWorld';
import type { SceneData } from '../../types';
import { generateTextureAtlas, type TextureAtlasResult } from './TextureManager';

interface SceneManagerProps {
  sceneData: SceneData;
  voxelWorld: VoxelWorld | null;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ sceneData, voxelWorld }) => {
  const meshes = useRef<Record<string, THREE.Mesh>>({});
  const [atlasData, setAtlasData] = useState<TextureAtlasResult | null>(null);

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
          // Assuming standard Quad order (BL, BR, TR, TL)
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
    const [x, y, z] = chunkId.split(',').map(Number);
    mesh.position.set(x * 32, y * 32, z * 32);
    meshes.current[chunkId] = mesh;
    voxelWorld.addChunkMesh(chunkId, mesh);
  };

  const { meshChunk } = useVoxelMesher(onMeshComplete);

  useEffect(() => {
    if (!sceneData || !sceneData.chunks || !atlasData) return;

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

    for (const chunk of sceneData.chunks) {
      const chunkId = chunk.position.join(',');
      const chunkData = new Uint8Array(32 * 32 * 32);

      const localToGlobalVars = chunk.palette.map(p => {
          if (atlasData.typeToIds[p]) return atlasData.typeToIds[p];
          return [0];
      });

      let writeIndex = 0;
      if (chunk.rle_data) {
          const rleParts = chunk.rle_data.split(',');
          for (const part of rleParts) {
              if (!part) continue;
              const [localIdStr, countStr] = part.split(':');
              const localId = parseInt(localIdStr, 10);
              const count = parseInt(countStr, 10);

              const variations = localToGlobalVars[localId];

              if (writeIndex + count > chunkData.length) break;

              if (variations.length === 1 && variations[0] === 0) {
                  chunkData.fill(0, writeIndex, writeIndex + count);
              } else {
                  for (let k = 0; k < count; k++) {
                      const idx = writeIndex + k;
                      // Simple deterministic hash
                      const seed = idx + (chunk.position[0] * 73856093) ^ (chunk.position[1] * 19349663) ^ (chunk.position[2] * 83492791);
                      const varIndex = Math.abs(seed) % variations.length;
                      chunkData[idx] = variations[varIndex];
                  }
              }
              writeIndex += count;
          }
      }

      meshChunk(chunkId, chunkData, [32, 32, 32]);
    }
  }, [sceneData, meshChunk, voxelWorld, atlasData]);

  return null;
};
