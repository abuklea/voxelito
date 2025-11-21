name: "P3S13b-Raycasting-Voxel-Selection"
description: |

## Purpose
Implement raycasting functionality to allow users to select voxels in the 3D scene by clicking on them. This is a prerequisite for feature interaction, such as editing or deleting voxels.

## Core Principles
1. **Context is King**: We are working with a Three.js scene managed by `VoxelWorld` class (imperative) but triggered via React components.
2. **Validation Loops**: We need to ensure that clicking on a voxel correctly identifies the voxel's coordinates and type.
3. **Information Dense**: We will use `THREE.Raycaster` and existing `VoxelWorld` structure.
4. **Progressive Success**: First detect intersection, then identify voxel coordinate, then highlight/select.

---

## Goal
Implement `InteractionController` to handle mouse clicks, perform raycasting, and identify the selected voxel.

## Why
- **User Interaction**: Essential for editing the scene.
- **Foundation**: Prerequisite for P3S14 (Selection Highlighting) and editing features.

## What
- A new component `InteractionController` that listens for pointer events on the canvas.
- Logic to cast a ray from the camera through the mouse position.
- Logic to intersect with voxel meshes.
- Calculation of the specific integer voxel coordinate from the intersection point.
- State update to store the selected voxel.

### Success Criteria
- [ ] Clicking on a voxel logs the correct voxel coordinate to the console.
- [ ] Clicking on empty space (or grid) deselects or ignores.
- [ ] The selection state is managed in a store (Zustand).

## All Needed Context

### Documentation & References
- **Three.js Raycaster**: `THREE.Raycaster` documentation.
- **Voxel Raycasting**: Intersecting with the mesh face gives a point. Depending on the face normal, we need to floor/ceil to get the integer voxel coordinate.

### Current Codebase tree
- `src/lib/VoxelWorld.ts`: Manages the Scene, Camera, Renderer.
- `src/features/viewer/Viewer.tsx`: Wrapper for the canvas container.
- `src/features/voxel-engine/SceneManager.tsx`: Manages meshes.
- `src/types.ts`: Types.

### Desired Codebase tree
- `src/features/viewer/InteractionController.tsx`: New component.
- `src/store/voxelStore.ts`: New store for selection state.

### Known Gotchas
- **React/Three Integration**: `VoxelWorld` controls the camera and scene imperatively. `InteractionController` needs access to `VoxelWorld` instance (camera and scene).
- **Coordinate Calculation**:
  - Intersection point is on the face.
  - To get the voxel *inside*, move slightly into the mesh along the negative normal.
  - To get the voxel *adjacent* (for placement), move slightly out along the normal.
  - For *selection* (this task), we likely want the voxel being clicked, so move 'in'.

## Implementation Blueprint

### Data models and structure

**Zustand Store (`src/store/voxelStore.ts`)**
```typescript
import { create } from 'zustand';

interface VoxelSelection {
  position: [number, number, number]; // x, y, z
  chunkId: string; // "x,y,z"
}

interface VoxelState {
  selectedVoxel: VoxelSelection | null;
  setSelectedVoxel: (selection: VoxelSelection | null) => void;
}

export const useVoxelStore = create<VoxelState>((set) => ({
  selectedVoxel: null,
  setSelectedVoxel: (selection) => set({ selectedVoxel: selection }),
}));
```

### Tasks

**Task 1: Create the Store**
- Create `src/store/voxelStore.ts` with the content above.

**Task 2: Create InteractionController**
- Create `src/features/viewer/InteractionController.tsx`.
- Access `VoxelWorld` instance via props.
- Add `pointerdown` event listener to the renderer's DOM element (or handle globally if simpler, but scoped is better).
- Note: `VoxelWorld` has `renderer.domElement`. We can attach listener there, but `VoxelWorld` is a class.
- Better approach: `InteractionController` is a React component rendered inside `App` or `Viewer`.
- Wait, `Viewer` is just a div wrapper. `VoxelWorld` attaches canvas to it.
- So `InteractionController` can attach event listener to `voxelWorld.renderer.domElement`.

**Task 3: Implement Raycasting Logic**
- inside `onPointerDown`:
  - Get mouse coordinates (normalized -1 to +1).
  - `raycaster.setFromCamera(mouse, camera)`.
  - `const intersects = raycaster.intersectObjects(scene.children)`.
  - Filter intersects to find voxel meshes.
  - Get `point` and `face.normal`.
  - Calculate voxel position: `pos = point - normal * 0.01`. Floor it.

**Task 4: Integrate into App**
- Add `InteractionController` to `VoxelApp` or `Viewer`.

## Validation Loop

### Level 1: Syntax & Style
- Check types.
- Lint.

### Level 2: Unit/Component Verification
- Verify that clicking logs coordinates.

### Level 3: Integration
- Verify with `verify_ui_voxelito.py` or manual test if possible.
