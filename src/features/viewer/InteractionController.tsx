import React, { useEffect } from 'react';
import * as THREE from 'three';
import { VoxelWorld } from '../../lib/VoxelWorld';
import { useVoxelStore } from '../../store/voxelStore';

interface InteractionControllerProps {
  /** The VoxelWorld instance to interact with. */
  voxelWorld: VoxelWorld | null;
}

/**
 * Handles user interactions with the 3D scene (e.g., clicking voxels).
 *
 * This component attaches event listeners to the renderer's DOM element to detect
 * clicks, performs raycasting to find intersected voxels, and updates the
 * global selection state in `voxelStore`.
 *
 * @param props - Component properties.
 */
export const InteractionController: React.FC<InteractionControllerProps> = ({ voxelWorld }) => {
  const setSelectedVoxel = useVoxelStore((state) => state.setSelectedVoxel);

  useEffect(() => {
    if (!voxelWorld) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent) => {
      // Only handle primary button (left click)
      if (event.button !== 0) return;

      const canvas = voxelWorld.renderer.domElement;
      const rect = canvas.getBoundingClientRect();

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, voxelWorld.camera);

      const intersects = raycaster.intersectObjects(voxelWorld.scene.children);

      // Filter for voxel meshes (filtering logic might need adjustment based on mesh naming/structure)
      // For now, assuming all meshes in scene (except grid/helpers) are voxels or we check for geometry attributes
      // But actually, the scene also has lights and helpers.
      // We can't easily tag meshes without modifying SceneManager, but we can check if object is a Mesh.

      for (const intersect of intersects) {
        if (intersect.object instanceof THREE.Mesh && intersect.face) {
            // Ignore grid helpers etc if possible.
            // GridHelper is LineSegments, not Mesh usually?
            // But the ground plane is a Mesh.
            // Ground plane has geometry PlaneGeometry.
            if (intersect.object.geometry.type === 'PlaneGeometry') continue;

            const p = intersect.point;
            const n = intersect.face.normal;

            // Transform normal to world space if the object is rotated/scaled
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
            const worldNormal = n.clone().applyMatrix3(normalMatrix).normalize();

            // To get the voxel coordinate *inside* the mesh (for selection), move slightly in against the normal
            const voxelVec = p.clone().add(worldNormal.clone().multiplyScalar(-0.01));

            const x = Math.floor(voxelVec.x / 32); // Assuming 32 is chunk size? No, wait.
            // The meshes are positioned at chunk offsets.
            // The vertices in the mesh are local to the chunk?
            // Let's check SceneManager.
            // "mesh.position.set(x * 32, y * 32, z * 32);"
            // And geometry position is local.
            // But wait, vertices are ints?
            // "geometry.setAttribute('position', new THREE.BufferAttribute(meshData.vertices, 3));"
            // The greedy mesher likely produces coordinates 0-32.
            // So the world coordinate is:

            const vx = Math.floor(voxelVec.x);
            const vy = Math.floor(voxelVec.y);
            const vz = Math.floor(voxelVec.z);

            console.log('Selected Voxel:', vx, vy, vz);

            // Find chunk ID?
            // We don't strictly need chunk ID for the store, just the global position.
            const cx = Math.floor(vx / 32);
            const cy = Math.floor(vy / 32);
            const cz = Math.floor(vz / 32);
            const chunkId = `${cx},${cy},${cz}`;

            setSelectedVoxel({
                position: [vx, vy, vz],
                chunkId: chunkId
            });

            return; // Stop at first voxel intersection
        }
      }

      // If we get here, we clicked nothing or non-voxel
      setSelectedVoxel(null);
    };

    const element = voxelWorld.renderer.domElement;
    element.addEventListener('pointerdown', onPointerDown);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
    };
  }, [voxelWorld, setSelectedVoxel]);

  return null;
};
