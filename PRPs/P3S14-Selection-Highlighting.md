name: "P3S14-Selection-Highlighting"
description: |

## Purpose
Implement visual feedback for the selected voxel by rendering a highlight box around it. This allows the user to confirm which voxel they are about to edit or inspect.

## Core Principles
1. **Feedback Loop**: The user performs an action (click), the state updates, and the visual feedback (highlight) confirms the action.
2. **Minimal Intrusion**: The highlight should be visible but not obscure the voxel itself excessively.
3. **Reactive Rendering**: The highlight component should react to changes in the `voxelStore`.

---

## Goal
Create a `SelectionHighlighter` component that subscribes to the `voxelStore` and renders a highlight mesh at the selected voxel's position.

## Why
- **Usability**: Without visual feedback, the user doesn't know which voxel is selected.
- **Precision**: Essential for precise editing operations.

## What
- A new component `SelectionHighlighter` that:
    - Subscribes to `selectedVoxel` from `useVoxelStore`.
    - Renders a wireframe box (or a semi-transparent colored box) at the selected voxel's world coordinates.
    - Updates position when selection changes.
    - Hides when nothing is selected.

### Success Criteria
- [ ] Clicking a voxel renders a highlight box exactly around it.
- [ ] Clicking another voxel moves the highlight box.
- [ ] Clicking empty space (deselecting) removes the highlight box.
- [ ] The highlight is visible against various background colors.

## All Needed Context

### Documentation & References
- **Three.js**: `THREE.BoxGeometry`, `THREE.LineSegments`, `THREE.EdgesGeometry`.

### Current Codebase tree
- `src/store/voxelStore.ts`: Holds `selectedVoxel` state.
- `src/features/viewer/Viewer.tsx`: Where `InteractionController` lives, likely place for `SelectionHighlighter` too.
- `src/lib/VoxelWorld.ts`: Provides scene context.

### Desired Codebase tree
- `src/features/viewer/SelectionHighlighter.tsx`: New component.

### Known Gotchas
- **Coordinate System**: The `selectedVoxel.position` is in world integer coordinates. The highlight mesh position needs to match.
  - A 1x1x1 box centered at (0,0,0) goes from -0.5 to +0.5.
  - A voxel at (x, y, z) likely occupies the space from (x, y, z) to (x+1, y+1, z+1) OR (x-0.5, y-0.5, z-0.5) to (x+0.5, y+0.5, z+0.5).
  - Based on `InteractionController`, we are flooring the coordinates, so (0,0,0) is the integer index.
  - In `SceneManager`, chunks are at `x*32`. Meshing is local 0-32.
  - If the mesher produces vertices at integer coordinates (0, 1, 2...), then a voxel at index 0 occupies 0 to 1? Or -0.5 to 0.5?
  - Usually greedy mesher produces faces at integer coordinates.
  - If I have a voxel at (0,0,0), its vertices are likely (0,0,0), (1,0,0), (0,1,0), etc.
  - So the center of the voxel is (0.5, 0.5, 0.5).
  - If I place a BoxGeometry at (x, y, z), and the box is 1x1x1, it is centered at (x, y, z).
  - So if the voxel is from 0 to 1, I should place the highlight at 0.5.
  - Therefore: highlight position = selectedVoxel.position + 0.5.

## Implementation Blueprint

### Tasks

**Task 1: Create SelectionHighlighter Component**
- Create `src/features/viewer/SelectionHighlighter.tsx`.
- `const selectedVoxel = useVoxelStore(state => state.selectedVoxel);`
- If `!selectedVoxel`, return null.
- Use `useEffect` to create/update a `THREE.Mesh` or `THREE.LineSegments`.
- Or better, since we are inside `Viewer` which is a React component but *not* inside `Canvas` (wait, `Viewer` wraps the canvas? No, `Viewer` is a DOM element, `VoxelWorld` creates the canvas).
- **Correction**: `VoxelWorld` is imperative. It manages the scene.
- `SelectionHighlighter` can be a React component that adds/removes a mesh to `voxelWorld.scene` via `useEffect`.
- **Alternative**: Can we use `react-three-fiber`?
  - The project seems to use a hybrid approach. `App.tsx` uses `Canvas`?
  - Let's check `App.tsx`.
  - Memory says: "Manages the lifecycle (initialization and disposal) of the voxel engine." "VoxelWorld is responsible for...".
  - `docs/06_PLAN.md`: "Step 4: ... containing the Canvas from react-three-fiber".
  - BUT `VoxelWorld` class (memory) seems to imply imperative management.
  - Let's check `src/App.tsx` and `src/features/viewer/Viewer.tsx` again.

**Task 2: Integrate into Viewer**
- Add `<SelectionHighlighter voxelWorld={voxelWorld} />` to `Viewer.tsx`.

## Validation Loop

### Level 1: Code Quality
- Linting.

### Level 2: visual Verification
- Run the app, click voxels, verify highlight appears and is aligned correctly.
