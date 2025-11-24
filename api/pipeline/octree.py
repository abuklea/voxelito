from typing import Dict, List, Tuple, Optional
import math

CHUNK_SIZE = 32

class SparseVoxelOctree:
    """
    A sparse voxel data structure tailored for large-scale generation.
    Internally uses spatial hashing (chunks) for O(1) access and compatibility
    with the frontend's RLE chunk format.
    """
    def __init__(self):
        # Map (cx, cy, cz) -> List[int] (size 32^3)
        self.chunks: Dict[Tuple[int, int, int], List[int]] = {}
        self.min_bounds = [float('inf'), float('inf'), float('inf')]
        self.max_bounds = [float('-inf'), float('-inf'), float('-inf')]

    def get_chunk(self, cx: int, cy: int, cz: int) -> List[int]:
        key = (cx, cy, cz)
        if key not in self.chunks:
            # Initialize with 0 (Air)
            self.chunks[key] = [0] * (CHUNK_SIZE ** 3)
        return self.chunks[key]

    def set_voxel(self, x: int, y: int, z: int, material_id: int):
        cx, rx = divmod(x, CHUNK_SIZE)
        cy, ry = divmod(y, CHUNK_SIZE)
        cz, rz = divmod(z, CHUNK_SIZE)

        chunk = self.get_chunk(cx, cy, cz)
        index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
        chunk[index] = material_id

        # Update bounds
        self.min_bounds = [min(self.min_bounds[0], x), min(self.min_bounds[1], y), min(self.min_bounds[2], z)]
        self.max_bounds = [max(self.max_bounds[0], x), max(self.max_bounds[1], y), max(self.max_bounds[2], z)]

    def get_voxel(self, x: int, y: int, z: int) -> int:
        cx, rx = divmod(x, CHUNK_SIZE)
        cy, ry = divmod(y, CHUNK_SIZE)
        cz, rz = divmod(z, CHUNK_SIZE)

        if (cx, cy, cz) not in self.chunks:
            return 0

        chunk = self.chunks[(cx, cy, cz)]
        index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
        return chunk[index]

    def fill_region(self, start: Tuple[int, int, int], size: Tuple[int, int, int], material_id: int):
        sx, sy, sz = start
        w, h, d = size
        ex, ey, ez = sx + w, sy + h, sz + d

        # Optimize by checking chunk intersection
        min_cx, min_rx = divmod(sx, CHUNK_SIZE)
        min_cy, min_ry = divmod(sy, CHUNK_SIZE)
        min_cz, min_rz = divmod(sz, CHUNK_SIZE)
        max_cx = (ex - 1) // CHUNK_SIZE
        max_cy = (ey - 1) // CHUNK_SIZE
        max_cz = (ez - 1) // CHUNK_SIZE

        for cx in range(min_cx, max_cx + 1):
            for cy in range(min_cy, max_cy + 1):
                for cz in range(min_cz, max_cz + 1):
                    # Chunk bounds
                    csx, csy, csz = cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE
                    cex, cey, cez = csx + CHUNK_SIZE, csy + CHUNK_SIZE, csz + CHUNK_SIZE

                    # Intersection
                    isx, isy, isz = max(sx, csx), max(sy, csy), max(sz, csz)
                    iex, iey, iez = min(ex, cex), min(ey, cey), min(ez, cez)

                    if isx >= iex or isy >= iey or isz >= iez:
                        continue

                    # If fully contained, fill chunk (if efficient)
                    # For now, just iterate voxels in intersection
                    chunk = self.get_chunk(cx, cy, cz)

                    # Local coords
                    lsx, lsy, lsz = isx - csx, isy - csy, isz - csz
                    lex, ley, lez = iex - csx, iey - csy, iez - csz

                    for z in range(lsz, lez):
                        z_offset = z * CHUNK_SIZE * CHUNK_SIZE
                        for y in range(lsy, ley):
                            y_offset = y * CHUNK_SIZE
                            base = z_offset + y_offset
                            # Python slice assignment is faster
                            chunk[base + lsx : base + lex] = [material_id] * (lex - lsx)
