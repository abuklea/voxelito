name: "P4S15b: Hierarchical Hybrid Pipeline & Path Tracing"
description: |
  Implement a 3-Stage Hierarchical Hybrid Pipeline for large-scale voxel generation and a Voxel Path Tracer for high-fidelity rendering.

## Purpose
To enable the generation of massive (500x500x500) voxel scenes with high detail and "stunning" lighting, overcoming the "Cubic Curse" of standard generative models.

## Why
-   **Scale:** Standard models fail at >64^3 due to memory constraints. We need 500^3.
-   **Fidelity:** Users want architectural detail and realistic lighting (MagicaVoxel style).
-   **Performance:** A hierarchical approach separates layout from detail, optimizing generation.

## What
1.  **Backend Pipeline:**
    -   **Stage A (Layout):** Wave Function Collapse (WFC) to generate a 50x50x50 semantic grid (City planning).
    -   **Stage B (Assets):** Procedural Asset Generator (simulating Latent Voxel Diffusion) to fill blocks with detailed voxels.
    -   **Stage C (Detail):** Voxel Super-Resolution (procedural upscaling) to refine shapes.
    -   **Data Structure:** Sparse Voxel Octree (SVO) in Python to manage the 125M potential voxels efficiently.
2.  **Frontend Rendering:**
    -   Integrate `three-gpu-pathtracer` (or high-fidelity shader equivalent) for realistic lighting (AO, GI, Emissive).
    -   Support "High Quality" mode toggle.

### Success Criteria
-   [ ] Backend can generate a 300x300x300 scene (Medium-Large) without timeout.
-   [ ] Generated scenes have logical layout (e.g., distinct zones for buildings/roads) via WFC.
-   [ ] Rendering includes Ambient Occlusion and improved lighting.
-   [ ] Project structure supports the "Model Training" slots (even if using procedural logic for now).

## All Needed Context

### Documentation & References
-   **WFC:** https://github.com/mxgmn/WaveFunctionCollapse (Concept)
-   **Three-GPU-Pathtracer:** https://github.com/gkjohnson/three-gpu-pathtracer
-   **Current Backend:** `api/index.py` (Rasterization logic)
-   **Current Frontend:** `src/features/voxel-engine/SceneManager.tsx`

### Current Codebase
-   `api/index.py`: Handles generation.
-   `src/lib/VoxelWorld.ts`: Manages Three.js scene.

### Known Gotchas
-   **Timeouts:** Large generation in Python might time out (Vercel limit). We must optimize WFC and procedural generation.
-   **Memory:** 500^3 is huge. Python list overhead is high. Use `bytearray` or strict SVO.
-   **Frontend Performance:** Path tracing is heavy. Must be optional or progressive.

## Implementation Blueprint

### Data Models (Python)

```python
# api/pipeline/octree.py
class SparseVoxelOctree:
    # Efficiently stores voxels for large coordinates
    ...

# api/pipeline/wfc.py
class SemanticBlock:
    type: str # "residential", "park", "road"
    orientation: str

class LayoutGenerator:
    def generate(self, size: int) -> List[SemanticBlock]:
        # WFC logic
        ...
```

### Tasks

#### Task 1: Backend - SVO & WFC (Stage A)
-   CREATE `api/pipeline/` directory.
-   CREATE `api/pipeline/octree.py`: Implement `SparseVoxelOctree` to handle sparse data better than a dict if possible, or wrap the dict to provide SVO-like interface.
-   CREATE `api/pipeline/wfc.py`: Implement a simplified Wave Function Collapse algorithm to generate a grid of "Zone IDs" based on adjacency rules (Road connects to Road, etc.).

#### Task 2: Backend - Asset & Detail Generation (Stage B & C)
-   CREATE `api/pipeline/assets.py`: Implement `AssetGenerator`.
    -   *Note:* Instead of loading a trained VQ-VAE (not possible in this env), implement procedural "Generators" for each Zone ID (e.g., `generate_skyscraper`, `generate_park`) that use the `VoxelOctree`.
-   CREATE `api/pipeline/super_res.py`: Implement `SuperResolver`.
    -   Function to take a coarse chunk and subdivide it, adding noise/detail (e.g., rough stone texture).

#### Task 3: Backend - Pipeline Integration
-   MODIFY `api/index.py`:
    -   Update `rasterize_scene` or create `generate_hierarchical_scene`.
    -   If request is "Large", use the Pipeline.
    -   Map the resulting SVO/Grid back to `ChunkResponse` format for the frontend.

#### Task 4: Frontend - Path Tracing Setup
-   INSTALL `three-gpu-pathtracer`.
-   MODIFY `src/lib/VoxelWorld.ts`:
    -   Add `initPathTracing()` method.
    -   It might need to convert `InstancedMesh` or `BufferGeometry` to a BVH.
    -   *Constraint:* If `three-gpu-pathtracer` is too complex to integrate with dynamic chunks, implement a "Post-Processing High-Quality" mode using `SSAO` and `UnrealBloom` (already present) but tuned for "Diorama" look (Depth of Field, Tilt-shift).
    -   *Decision:* Start with tuning existing Post-Processing to maximum fidelity (Tilt-Shift, strong AO) as a baseline "Fix", then attempt Path Tracing if time permits.
    -   *Correction:* The user explicitly requested Path Tracing. I will try to set up the basic scaffolding for it.

## Validation Loop

### Level 1: Syntax & Style
```bash
ruff check api/ --fix
mypy api/
```

### Level 2: Unit Tests
```python
# api/tests/test_pipeline.py
def test_wfc_layout():
    generator = LayoutGenerator()
    layout = generator.generate(size=10)
    assert len(layout) == 1000 # 10x10x10
    # Check adjacency rules
```

### Level 3: Integration Test
-   Run backend: `uvicorn api.index:app`
-   Send "Large" generation request.
-   Verify response contains chunks covering a large area.
