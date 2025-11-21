import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useVoxelStore } from '../../store/voxelStore';
import { VoxelWorld } from '../../lib/VoxelWorld';

interface SelectionHighlighterProps {
  voxelWorld: VoxelWorld | null;
}

export const SelectionHighlighter: React.FC<SelectionHighlighterProps> = ({ voxelWorld }) => {
  const selectedVoxel = useVoxelStore((state) => state.selectedVoxel);
  const highlightMeshRef = useRef<THREE.LineSegments | null>(null);

  useEffect(() => {
    if (!voxelWorld) return;

    // Create the highlight mesh if it doesn't exist
    if (!highlightMeshRef.current) {
      const boxGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
      const geometry = new THREE.EdgesGeometry(boxGeo);
      boxGeo.dispose(); // Dispose the intermediate geometry
      const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }); // Cyan color
      const mesh = new THREE.LineSegments(geometry, material);
      mesh.visible = false; // Initially hidden
      voxelWorld.scene.add(mesh);
      highlightMeshRef.current = mesh;
    }

    const mesh = highlightMeshRef.current;

    if (selectedVoxel) {
      const [x, y, z] = selectedVoxel.position;
      // BoxGeometry is centered, so we need to offset by 0.5 to match voxel grid which starts at integer corners
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.visible = true;
    } else {
      mesh.visible = false;
    }

    voxelWorld.requestRender();

  }, [voxelWorld, selectedVoxel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voxelWorld && highlightMeshRef.current) {
        voxelWorld.scene.remove(highlightMeshRef.current);
        highlightMeshRef.current.geometry.dispose();
        (highlightMeshRef.current.material as THREE.Material).dispose();
        highlightMeshRef.current = null;
        voxelWorld.requestRender();
      }
    };
  }, [voxelWorld]);

  return null;
};
