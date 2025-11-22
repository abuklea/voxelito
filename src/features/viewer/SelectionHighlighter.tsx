import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useVoxelStore } from '../../store/voxelStore';
import { VoxelWorld } from '../../lib/VoxelWorld';

interface SelectionHighlighterProps {
  voxelWorld: VoxelWorld | null;
}

/**
 * Renders the selected voxels using an InstancedMesh for performance.
 */
export const SelectionHighlighter: React.FC<SelectionHighlighterProps> = ({ voxelWorld }) => {
  const selectedVoxels = useVoxelStore((state) => state.selectedVoxels);
  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  // Initialize the InstancedMesh
  useEffect(() => {
    if (!voxelWorld) return;

    // Geometry: Slightly larger than 1x1x1 to overlay
    const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);

    // Material: Semi-transparent cyan
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false, // Don't write to depth buffer (transparency issue fix)
      side: THREE.DoubleSide,
    });

    // Max instances: Estimate max selection. 100k is a safe buffer for WebGL 2.
    // Dynamic resizing of InstancedMesh is possible but tricky.
    const maxCount = 10000;
    const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    mesh.count = 0; // Start hidden

    // Mark as non-raycastable so we don't select the highlight itself
    mesh.raycast = () => {};

    voxelWorld.scene.add(mesh);
    meshRef.current = mesh;

    return () => {
      if (voxelWorld && meshRef.current) {
        voxelWorld.scene.remove(meshRef.current);
        meshRef.current.dispose();
        geometry.dispose();
        material.dispose();
        meshRef.current = null;
        voxelWorld.requestRender();
      }
    };
  }, [voxelWorld]);

  // Update instances when selection changes
  useEffect(() => {
    if (!meshRef.current || !voxelWorld) return;

    const voxels = Object.values(selectedVoxels);
    const count = Math.min(voxels.length, meshRef.current.instanceMatrix.count);
    meshRef.current.count = count;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { position } = voxels[i];
      dummy.position.set(position[0] + 0.5, position[1] + 0.5, position[2] + 0.5);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    voxelWorld.requestRender();
  }, [selectedVoxels, voxelWorld]);

  return null;
};
