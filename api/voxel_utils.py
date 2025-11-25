from typing import List, Dict
from pydantic import BaseModel
from api.common import PALETTE

# --- Constants ---
MIN_COORD = -512
MAX_COORD = 512
CHUNK_SIZE = 32

# --- API Models ---
class ChunkResponse(BaseModel):
    position: List[int]
    rle_data: str
    palette: List[str]

# --- Voxel Grid Logic ---
class VoxelGrid:
    def __init__(self):
        self.chunks: Dict[tuple, List[int]] = {}

    def get_chunk(self, cx, cy, cz):
        key = (cx, cy, cz)
        if key not in self.chunks:
            self.chunks[key] = [0] * (CHUNK_SIZE ** 3)
        return self.chunks[key]

    def fill_chunk(self, cx, cy, cz, material_idx):
        self.chunks[(cx, cy, cz)] = [material_idx] * (CHUNK_SIZE ** 3)

    def set_voxel(self, x, y, z, material_idx):
        if not (MIN_COORD <= x < MAX_COORD and MIN_COORD <= y < MAX_COORD and MIN_COORD <= z < MAX_COORD):
            return
        cx, rx = divmod(x, CHUNK_SIZE)
        cy, ry = divmod(y, CHUNK_SIZE)
        cz, rz = divmod(z, CHUNK_SIZE)
        chunk = self.get_chunk(cx, cy, cz)
        index = rx + ry * CHUNK_SIZE + rz * CHUNK_SIZE * CHUNK_SIZE
        chunk[index] = material_idx

def convert_grid_to_chunks(chunks_dict: Dict[tuple, List[int]]) -> List[ChunkResponse]:
    response_chunks = []
    for (cx, cy, cz), voxels in chunks_dict.items():
        rle_parts = []
        current_val = voxels[0]
        current_count = 1
        for val in voxels[1:]:
            if val == current_val:
                current_count += 1
            else:
                rle_parts.append(f"{current_val}:{current_count}")
                current_val = val
                current_count = 1
        rle_parts.append(f"{current_val}:{current_count}")
        rle_str = ",".join(rle_parts)
        response_chunks.append(ChunkResponse(position=[cx, cy, cz], rle_data=rle_str, palette=PALETTE))
    return response_chunks
