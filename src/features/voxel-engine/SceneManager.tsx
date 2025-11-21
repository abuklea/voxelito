import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelMesher } from '../../hooks/useVoxelMesher';
import { VoxelWorld } from '../../lib/VoxelWorld';
import type { SceneData, VoxelType } from '../../types';
import { palette } from './palette';

// Create a map from VoxelType to ID (index)
// We start from 1 because 0 is air
const voxelTypes = Object.keys(palette) as VoxelType[];
const voxelTypeMap: Record<string, number> = {};
const idToColor: Record<number, THREE.Color> = {};

voxelTypes.forEach((type, index) => {
  if (type === 'air') {
    voxelTypeMap[type] = 0;
    // Air doesn't have a color usually, or it's not rendered
  } else {
    // We want IDs to be > 0
    // Let's assume air is at index 0 in `voxelTypes` list, but we can force it.
    // Actually, let's just assign arbitrary IDs starting from 1 for non-air.
    // Wait, `voxelTypes` order depends on `palette` definition order.
    // Let's just iterate.
    const id = type === 'air' ? 0 : index + 1;
    voxelTypeMap[type] = id;
    if (palette[type]) {
       idToColor[id] = new THREE.Color(palette[type].color);
    }
  }
});


interface SceneManagerProps {
  sceneData: SceneData;
  voxelWorld: VoxelWorld | null;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ sceneData, voxelWorld }) => {
  const meshes = useRef<Record<string, THREE.Mesh>>({});

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true, // Enable vertex colors
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  const onMeshComplete = (chunkId: string, meshData: {
    vertices: Float32Array;
    indices: Uint32Array;
    voxelIds: Uint8Array;
  }) => {
    if (!voxelWorld) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));

    // Convert voxelIds to colors
    const colors = new Float32Array(meshData.vertices.length); // vertices are x,y,z so length is 3 * count
    // No, wait. `meshData.vertices` is a flat array of coordinates [x1, y1, z1, x2, y2, z2, ...]
    // `meshData.voxelIds` corresponds to vertices?
    // In the worker: `voxelIds.push(actualVoxelId, actualVoxelId, actualVoxelId, actualVoxelId)` for the 4 vertices of a quad.
    // So `voxelIds` has same count as number of vertices (not coordinates).
    // `vertices.length` is numVertices * 3.
    // `voxelIds.length` is numVertices.

    for (let i = 0; i < meshData.voxelIds.length; i++) {
      const id = meshData.voxelIds[i];
      const color = idToColor[id] || new THREE.Color(0xff00ff); // Magenta for error
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
        const type = chunk.voxels[i].type;
        if (voxelTypeMap[type] !== undefined) {
             chunkData[i] = voxelTypeMap[type];
        } else {
            console.warn(`Unknown voxel type: ${type}`);
            chunkData[i] = 0; // Default to air or handle error
        }
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
