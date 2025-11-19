# PRP: Voxel Meshing Web Worker (P2S9)

## Goal
To create a dedicated Web Worker that runs a greedy meshing algorithm. This will offload the computationally intensive task of mesh generation from the main UI thread, ensuring the application remains responsive and smooth, even when processing large voxel scenes.

## Why
-   **Performance**: Prevents the UI from freezing or stuttering during the mesh generation process.
-   **User Experience**: Ensures a smooth, interactive experience by keeping the main thread free for rendering and user input.
-   **Scalability**: Allows the application to handle larger and more complex voxel models without degrading performance.

## What
The Web Worker will be a self-contained script responsible for a single task: receiving voxel data and returning optimized mesh geometry.

### Success Criteria
-   [x] A new Web Worker script is created at `public/workers/greedy-mesher.worker.ts`.
-   [x] The worker correctly receives chunk data (voxel types and dimensions) from the main thread.
-   [x] The worker implements a greedy meshing algorithm to generate vertices and indices for the chunk geometry.
-   [x] The worker sends the generated geometry data back to the main thread in a structured, serializable format.

## All Needed Context

### Documentation & References
```yaml
# MUST READ - This provides the theoretical basis for the algorithm.
- url: https://github.com/cgerikj/binary-greedy-meshing
  why: Explains the core concepts of greedy meshing using bitwise operations for speed. While we won't implement the exact same thing, the principles of face culling and quad merging are essential.
```

### Current Codebase Tree
```bash
.
├── PRPs/
│   └── ... (existing PRPs)
├── api/
├── docs/
├── public/
├── src/
│   ├── features/
│   │   └── voxel-engine/
│   │       ├── types.ts
│   │       └── palette.ts
│   └── ...
└── ...
```

### Desired Codebase Tree
```bash
.
├── public/
│   └── workers/
│       └── greedy-mesher.worker.ts  # <-- File to be created
└── ...
```

### Known Gotchas & Library Quirks
-   **Web Worker Scope**: The worker runs in a separate global scope (`DedicatedWorkerGlobalScope`). It has no access to the `document`, `window`, or any of the main application's variables. All communication must be done via `postMessage`.
-   **Data Serialization**: Data passed to and from the worker is serialized. For performance, we should use `Transferable` objects (like `ArrayBuffer`) when possible to avoid cloning large data structures, though for this initial implementation, standard serialization is acceptable.

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
CREATE public/workers/greedy-mesher.worker.ts:
  - Set up the basic worker message listener (`self.onmessage`).
  - Implement the greedy meshing algorithm.
  - The algorithm should iterate through each of the 6 faces of the voxel grid (front, back, top, bottom, left, right).
  - For each face, it should generate a 2D slice of the grid and greedily merge adjacent voxels of the same type into larger quads.
  - The result should be a list of vertices and indices.
  - Post the generated geometry back to the main thread.
```

### Per task pseudocode as needed added to each task
```typescript
// public/workers/greedy-mesher.worker.ts

self.onmessage = (event) => {
    const { chunkData, dimensions } = event.data;

    // Dimensions of the chunk (e.g., 16x16x16)
    const [width, height, depth] = dimensions;

    const vertices = [];
    const indices = [];
    let indexOffset = 0;

    // Iterate over the 6 directions (x, -x, y, -y, z, -z)
    for (let d = 0; d < 3; ++d) { // dimension (x, y, z)
        for (let s = -1; s <= 1; s += 2) { // side (negative or positive)

            const u = (d + 1) % 3; // u-axis
            const v = (d + 2) % 3; // v-axis

            const slice = new Array(height * width).fill(0);

            // Create a 2D slice of the chunk for the current direction
            for (let i = 0; i < width; ++i) {
                for (let j = 0; j < height; ++j) {
                    // Logic to get the voxel type at (i, j) on the slice
                    // ... and check if it's a visible face
                }
            }

            // Greedy meshing on the 2D slice
            for (let j = 0; j < height; ++j) {
                for (let i = 0; i < width; ) {
                    const voxelType = slice[j * width + i];
                    if (voxelType) {
                        // Find the largest possible quad starting at (i, j)
                        let w = 1, h = 1;
                        while (i + w < width && slice[j * width + (i + w)] === voxelType) {
                            w++;
                        }
                        let canExtendH = true;
                        while (j + h < height && canExtendH) {
                            for (let k = 0; k < w; ++k) {
                                if (slice[(j + h) * width + (i + k)] !== voxelType) {
                                    canExtendH = false;
                                    break;
                                }
                            }
                            if (canExtendH) {
                                h++;
                            }
                        }

                        // Add the quad's vertices and indices to the main lists
                        // ... logic to create 4 vertices and 2 triangles (6 indices)

                        // Mark the area as visited
                        for (let l = 0; l < h; ++l) {
                            for (let k = 0; k < w; ++k) {
                                slice[(j + l) * width + (i + k)] = 0;
                            }
                        }

                        i += w;
                    } else {
                        i++;
                    }
                }
            }
        }
    }

    self.postMessage({ vertices, indices });
};
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# We will rely on the existing project's linting setup.
# Run this from the root directory after creating the file.
npx eslint public/workers/greedy-mesher.worker.ts
npx tsc --noEmit
```

### Level 2: Unit Tests
Unit testing a web worker directly is complex. For this step, we will rely on manual validation by integrating it with the `SceneManager` in a future step (P2S10) and visually confirming that the generated meshes are correct.

### Level 3: Integration Test
This will be performed in P2S10, where we will create the `SceneManager` that uses this worker. The success of that step will validate this one. We will check for:
-   Correct mesh generation for a simple cube.
-   Correct culling of internal faces (e.g., a 2x1x1 block should only have 10 faces, not 12).
-   No errors in the browser console related to the worker.

## Final validation Checklist
-   [ ] No linting errors: `npx eslint public/workers/greedy-mesher.worker.ts`
-   [ ] No type errors: `npx tsc --noEmit`
-   [ ] The worker script is created at the correct path.
-   [ ] The worker correctly implements the greedy meshing logic.
-   [ ] The worker communicates with the main thread using `self.onmessage` and `self.postMessage`.
