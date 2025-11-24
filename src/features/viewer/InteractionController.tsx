import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VoxelWorld } from '../../lib/VoxelWorld';
import { useVoxelStore } from '../../store/voxelStore';
import { useNotificationStore } from '../../store/notificationStore';
import type { SelectionMode, VoxelSelection } from '../../store/voxelStore';

const MAX_SELECTION_SIZE = 10000;

interface InteractionControllerProps {
  voxelWorld: VoxelWorld | null;
}

export const InteractionController: React.FC<InteractionControllerProps> = ({ voxelWorld }) => {
  const {
    selectionMode,
    selectionTool,
    brushSize,
    selectedVoxels,
    setSelectedVoxels,
    addVoxelToSelection,
    removeVoxelFromSelection,
  } = useVoxelStore();

  const { showToast } = useNotificationStore();

  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; z: number } | null>(null);
  const selectionAtStart = useRef<Record<string, VoxelSelection>>({});

  // Helper: Get voxel coordinate from raycast hit
  const getVoxelCoord = (point: THREE.Vector3, normal: THREE.Vector3) => {
    const voxelVec = point.clone().add(normal.clone().multiplyScalar(-0.01));
    return {
      x: Math.floor(voxelVec.x),
      y: Math.floor(voxelVec.y),
      z: Math.floor(voxelVec.z),
    };
  };

  // Helper: Generate a key for the map
  const getKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  // Helper: Get all voxels in a box defined by two corners
  const getVoxelsInBox = (
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
  ) => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const voxels: VoxelSelection[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          voxels.push({
            position: [x, y, z],
            chunkId: `${Math.floor(x / 32)},${Math.floor(y / 32)},${Math.floor(z / 32)}`,
          });
        }
      }
    }
    return voxels;
  };

  // Helper: Get voxels in a sphere
  const getVoxelsInSphere = (center: { x: number; y: number; z: number }, radius: number) => {
    const voxels: VoxelSelection[] = [];
    const r = Math.ceil(radius);
    const rSq = radius * radius;

    for (let x = center.x - r; x <= center.x + r; x++) {
      for (let y = center.y - r; y <= center.y + r; y++) {
        for (let z = center.z - r; z <= center.z + r; z++) {
            const distSq = (x - center.x)**2 + (y - center.y)**2 + (z - center.z)**2;
            if (distSq <= rSq) {
                 voxels.push({
                    position: [x, y, z],
                    chunkId: `${Math.floor(x / 32)},${Math.floor(y / 32)},${Math.floor(z / 32)}`,
                 });
            }
        }
      }
    }
    return voxels;
  };

  useEffect(() => {
    if (!voxelWorld) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersect = (clientX: number, clientY: number) => {
      const canvas = voxelWorld.renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, voxelWorld.camera);
      const intersects = raycaster.intersectObjects(voxelWorld.scene.children);

      for (const intersect of intersects) {
         if (intersect.object instanceof THREE.Mesh && intersect.face) {
             // Simple filter: skip PlaneGeometry (ground plane often) if strictly needed,
             // but we can also just allow selecting the 'air' above the plane if we want to build there.
             // For now, assume we select existing voxels.
             // If we want to select EMPTY space to build, we need a different raycaster (against a grid/plane).
             // The prompt says "select only the voxels...". So we select existing voxels.

             // Ignore helpers/grid if possible.
             if (intersect.object.geometry.type === 'PlaneGeometry') continue; // Ground plane
             return intersect;
         }
      }
      return null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const intersect = getIntersect(event.clientX, event.clientY);

      // Determine effective mode
      let mode: SelectionMode = selectionMode;
      if (event.shiftKey) mode = 'add';
      else if (event.altKey || event.ctrlKey) mode = 'subtract';

      if (!intersect) {
        if (mode === 'replace') {
            setSelectedVoxels({});
        }
        return;
      }

      isDragging.current = true;
      const voxel = getVoxelCoord(intersect.point, intersect.face!.normal);
      dragStart.current = voxel;

      // Snapshot current selection
      selectionAtStart.current = { ...useVoxelStore.getState().selectedVoxels };

      applyTool(voxel, mode, true);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging.current || !dragStart.current) return;

      const intersect = getIntersect(event.clientX, event.clientY);
      if (!intersect) return;

      const voxel = getVoxelCoord(intersect.point, intersect.face!.normal);

      // Determine effective mode
      let mode: SelectionMode = selectionMode;
      if (event.shiftKey) mode = 'add';
      else if (event.altKey || event.ctrlKey) mode = 'subtract';

      applyTool(voxel, mode, false);
    };

    const onPointerUp = () => {
      isDragging.current = false;
      dragStart.current = null;
      selectionAtStart.current = {};
    };

    const applyTool = (targetVoxel: {x:number, y:number, z:number}, mode: SelectionMode, isStart: boolean) => {
        let voxelsToApply: VoxelSelection[] = [];

        if (selectionTool === 'box' && dragStart.current) {
            voxelsToApply = getVoxelsInBox(dragStart.current, targetVoxel);
        } else if (selectionTool === 'sphere') {
             voxelsToApply = getVoxelsInSphere(targetVoxel, brushSize);
        } else {
             // Cursor (Single)
             voxelsToApply = [{
                 position: [targetVoxel.x, targetVoxel.y, targetVoxel.z],
                 chunkId: `${Math.floor(targetVoxel.x/32)},${Math.floor(targetVoxel.y/32)},${Math.floor(targetVoxel.z/32)}`
             }];
        }

        if (voxelsToApply.length > MAX_SELECTION_SIZE) {
            showToast(`Selection too large (${voxelsToApply.length} voxels). Max is ${MAX_SELECTION_SIZE}.`, 'error');
            return;
        }

        // Logic divergence:
        // Box: "Rubber band" logic. Always relative to Start. Re-evaluate total selection from (StartSelection + Box).
        // Brush (Cursor/Sphere): "Paint" logic. Add to current selection continuously.

        if (selectionTool === 'box') {
             const newSelection = { ...selectionAtStart.current };

             if (mode === 'replace') {
                 // Clear start, apply box
                 // Actually if mode is replace, selectionAtStart should be ignored?
                 // "Replace" usually means: The result IS the box.
                 const final: Record<string, VoxelSelection> = {};
                 voxelsToApply.forEach(v => {
                     final[getKey(...v.position)] = v;
                 });
                 if (Object.keys(final).length > MAX_SELECTION_SIZE) {
                     showToast("Total selection exceeds limit.", 'error');
                     return;
                 }
                 setSelectedVoxels(final);
             } else if (mode === 'add') {
                 voxelsToApply.forEach(v => {
                     newSelection[getKey(...v.position)] = v;
                 });
                 if (Object.keys(newSelection).length > MAX_SELECTION_SIZE) {
                     showToast("Total selection exceeds limit.", 'error');
                     return;
                 }
                 setSelectedVoxels(newSelection);
             } else if (mode === 'subtract') {
                 voxelsToApply.forEach(v => {
                     delete newSelection[getKey(...v.position)];
                 });
                 setSelectedVoxels(newSelection);
             }
        } else {
            // Brush/Cursor logic (Paint)
            // We modify the store directly and cumulatively.

            if (isStart && mode === 'replace') {
                setSelectedVoxels({});
                // Check if adding creates too many
                if (voxelsToApply.length > MAX_SELECTION_SIZE) {
                     showToast("Selection exceeds limit.", 'error');
                     return;
                }

                const final: Record<string, VoxelSelection> = {};
                voxelsToApply.forEach(v => {
                     final[getKey(...v.position)] = v;
                });
                setSelectedVoxels(final);
            } else {
                const effectiveMode = (mode === 'replace') ? 'add' : mode;

                if (effectiveMode === 'add') {
                     // Check total size
                     const currentCount = Object.keys(useVoxelStore.getState().selectedVoxels).length;
                     if (currentCount + voxelsToApply.length > MAX_SELECTION_SIZE) {
                         // Only warn once per drag?
                         // For now, just warn and don't add.
                         if (Math.random() < 0.1) showToast("Selection limit reached.", 'error'); // throttle toast
                         return;
                     }
                     voxelsToApply.forEach(v => addVoxelToSelection(v));
                } else if (effectiveMode === 'subtract') {
                     voxelsToApply.forEach(v => removeVoxelFromSelection(v.position));
                }
            }
        }
    };

    const element = voxelWorld.renderer.domElement;
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    // Leave/Cancel?

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
    };
  }, [voxelWorld, selectionMode, selectionTool, brushSize, setSelectedVoxels, addVoxelToSelection, removeVoxelFromSelection]);

  return null;
};
