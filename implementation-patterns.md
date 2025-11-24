# Implementation Patterns - Voxelito

## Overview
This document details the specific implementation patterns used in Voxelito. It serves as a reference for developers to understand *how* specific features are built, providing code snippets and architectural context.

## Rendering Pattern: The "VoxelWorld" Abstraction

### Concept
The application separates the React UI logic from the imperative Three.js rendering logic. The `VoxelWorld` class acts as a facade, exposing high-level methods to the React components.

### Usage in React
The `useVoxelWorld` hook manages the lifecycle of this class.

```typescript
// src/hooks/useVoxelWorld.ts
export const useVoxelWorld = () => {
  const [voxelWorld, setVoxelWorld] = useState<VoxelWorld | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node && !voxelWorld) {
      const vw = new VoxelWorld(node);
      setVoxelWorld(vw);
    }
    // Cleanup handled in useEffect usually, or careful ref management
  }, []);

  return { voxelWorld, ref };
};
```

### Dynamic Texture Atlas
To optimize rendering, we avoid creating thousands of materials. Instead, we generate a single texture atlas at runtime.

```typescript
// src/features/voxel-engine/TextureManager.ts
// Key Step: Draw individual images onto a canvas and calculate UVs
ctx.drawImage(img, col * TEXTURE_SIZE, row * TEXTURE_SIZE, ...);
idToUV[currentId] = { u, v, su, sv };
```

## Worker Pattern: Off-Main-Thread Meshing

### Concept
Generating meshes for voxel chunks is computationally expensive (O(N^3)). We use a Web Worker to perform "Greedy Meshing" in the background.

### Message Protocol
*   **Input:** `VoxelChunkData` (Int8Array of voxel IDs, Dimensions).
*   **Output:** `GeometryData` (Float32Array vertices, Uint32Array indices).

### Implementation Snippet
```typescript
// src/workers/greedy-mesher.worker.ts
self.onmessage = (event) => {
    // 1. Receive Chunk Data
    const { chunkData } = event.data;

    // 2. Perform Greedy Meshing Algorithm
    // ... iterates over slices, merges faces ...

    // 3. Post Transferable Objects back
    self.postMessage(result, [result.vertices.buffer, ...]);
};
```

## AI Streaming Pattern: SSE for CopilotKit

### Concept
CopilotKit expects a streaming response. Since we use a custom Python backend, we manually implement the Server-Sent Events (SSE) protocol to wrap our agent's output.

### Protocol Structure
The backend yields chunks in this format:
`data: {"data": {"generateCopilotResponse": {"messages": [...]}}}\n\n`

### Backend Implementation
```python
# api/index.py
async def stream_handler(body, client_ip):
    # ... Run Agent ...
    async for chunk in agent.run_stream(prompt):
        # Format as CopilotKit expects
        response = format_for_copilot(chunk)
        yield f"data: {json.dumps(response)}\n\n"
```

## Hierarchical Pipeline Pattern

### Concept
To solve the "Cubic Curse" (exponential growth of voxels vs. scale), we use a 3-stage generation pipeline for large scenes.

### Stages
1.  **Layout (WFC):** Generates a semantic grid (e.g., Road, Building) at a low resolution (block size = 32^3 voxels).
2.  **Asset Generation:** Fills each semantic block with high-resolution voxel data using procedural algorithms.
3.  **Octree Storage:** Data is stored in a `SparseVoxelOctree` to allow efficient sparse storage before RLE compression for the frontend.

## State Management Pattern (Zustand)

### Concept
We use `zustand` for a centralized store that can be accessed both inside and outside React components (via `useVoxelStore.getState()`).

### Pattern
Actions are defined alongside state in the store definition.

```typescript
// src/store/voxelStore.ts
export const useVoxelStore = create<VoxelState>((set) => ({
  selectedVoxels: {},
  // Action
  addVoxelToSelection: (voxel) => set((state) => ({
    selectedVoxels: { ...state.selectedVoxels, [key]: voxel }
  })),
}));
```

## Error Handling Pattern

### Error Boundaries
We use a React `ErrorBoundary` at the root to catch UI crashes.

### Toast Notifications
Global toast notifications are managed via `notificationStore`. The backend sends error messages in a specific JSON format which the frontend parses and displays as toasts.
