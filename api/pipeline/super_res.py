import random
from .octree import SparseVoxelOctree, CHUNK_SIZE
from ..common import PALETTE_MAP

class SuperResolver:
    """
    Simulates the Voxel Super-Resolution step by adding high-frequency detail
    to the generated chunks.
    """
    def __init__(self, octree: SparseVoxelOctree):
        self.octree = octree

    def apply_detail_pass(self):
        # Iterate over all existing chunks
        # Note: Modifying chunks while iterating keys is risky if we add new chunks,
        # but here we only modify existing voxels or add to existing chunks.

        # We need a list of keys first
        keys = list(self.octree.chunks.keys())

        for cx, cy, cz in keys:
            chunk = self.octree.chunks[(cx, cy, cz)]
            self._refine_chunk(chunk, cx, cy, cz)

    def _refine_chunk(self, chunk: list, cx: int, cy: int, cz: int):
        # Simple procedural noise
        # If we find "Stone", maybe turn it into "Mossy Stone" (if we had it)
        # Or add random noise to surfaces.

        # For this implementation, we will simulate "Weathering"
        # Randomly erode edges or add moss (Green voxels on top of stone)

        for i in range(len(chunk)):
            val = chunk[i]
            if val == 0: continue

            # Reconstruct local coords
            # index = rx + ry * 32 + rz * 1024
            rz = i // 1024
            rem = i % 1024
            ry = rem // 32
            rx = rem % 32

            # Global coords (for deterministic noise)
            gx = cx * CHUNK_SIZE + rx
            gy = cy * CHUNK_SIZE + ry
            gz = cz * CHUNK_SIZE + rz

            # Noise function
            seed = (gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791)
            noise = (seed % 100) / 100.0

            # Detail: Grass on Dirt
            if val == PALETTE_MAP.get('dirt') and noise > 0.8:
                # Check if air above? (Too expensive to check neighbor chunks here)
                # Just random variation
                if (ry < 31):
                    # Local check
                    above = chunk[rx + (ry+1)*32 + rz*1024]
                    if above == 0:
                        chunk[i] = PALETTE_MAP.get('grass', 1)

            # Detail: Texture variation
            # (In Voxelito, variations are handled by the shader/mesher based on position,
            # so we don't need to change IDs unless we change materials)
