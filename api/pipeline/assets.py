import random
from .octree import SparseVoxelOctree
from .wfc import ZoneType, SemanticBlock
from ..common import PALETTE_MAP

BLOCK_SIZE = 32

class AssetGenerator:
    def __init__(self, octree: SparseVoxelOctree):
        self.octree = octree

    def generate_block(self, block: SemanticBlock):
        # Calculate global coordinates
        gx = block.x * BLOCK_SIZE
        gy = block.y * BLOCK_SIZE
        gz = block.z * BLOCK_SIZE

        if block.zone == ZoneType.ROAD:
            self._gen_road(gx, gy, gz)
        elif block.zone == ZoneType.RESIDENTIAL:
            self._gen_residential(gx, gy, gz)
        elif block.zone == ZoneType.COMMERCIAL:
            self._gen_commercial(gx, gy, gz)
        elif block.zone == ZoneType.PARK:
            self._gen_park(gx, gy, gz)

    def _gen_road(self, x, y, z):
        # Basic asphalt
        self.octree.fill_region((x, y, z), (BLOCK_SIZE, 1, BLOCK_SIZE), PALETTE_MAP['asphalt'])
        # Markings (dashed line in middle)
        for i in range(0, BLOCK_SIZE, 8):
            self.octree.fill_region((x + 15, y, z + i + 2), (2, 1, 4), PALETTE_MAP['road_white'])

    def _gen_residential(self, x, y, z):
        # Grass ground
        self.octree.fill_region((x, y, z), (BLOCK_SIZE, 1, BLOCK_SIZE), PALETTE_MAP['grass'])

        # House
        margin = 4
        h_width = BLOCK_SIZE - 2 * margin
        h_height = 10
        self.octree.fill_region((x + margin, y + 1, z + margin), (h_width, h_height, h_width), PALETTE_MAP['brick'])

        # Roof (Pyramid-ish)
        for i in range(h_width // 2):
            self.octree.fill_region(
                (x + margin + i, y + 1 + h_height + i, z + margin + i),
                (h_width - 2*i, 1, h_width - 2*i),
                PALETTE_MAP['roof']
            )

    def _gen_commercial(self, x, y, z):
        # Concrete ground
        self.octree.fill_region((x, y, z), (BLOCK_SIZE, 1, BLOCK_SIZE), PALETTE_MAP['concrete'])

        # Skyscraper
        margin = 2
        width = BLOCK_SIZE - 2 * margin
        height = BLOCK_SIZE + 10 # Tall!

        # Main structure
        self.octree.fill_region((x + margin, y + 1, z + margin), (width, height, width), PALETTE_MAP['metal'])

        # Windows (Neon/Glass strips)
        for h in range(y + 4, y + height, 4):
             self.octree.fill_region((x + margin, h, z + margin), (width, 1, width), PALETTE_MAP['glass'])

        # Neon trim
        self.octree.fill_region((x + margin, y + height, z + margin), (width, 1, width), PALETTE_MAP['neon_blue'])

    def _gen_park(self, x, y, z):
        # Grass
        self.octree.fill_region((x, y, z), (BLOCK_SIZE, 1, BLOCK_SIZE), PALETTE_MAP['grass'])

        # Tree
        tx, tz = x + BLOCK_SIZE // 2, z + BLOCK_SIZE // 2
        # Trunk
        self.octree.fill_region((tx, y + 1, tz), (2, 8, 2), PALETTE_MAP['wood'])
        # Leaves (Sphere-ish)
        c_y = y + 8
        r = 6
        for lx in range(tx - r, tx + r):
            for ly in range(c_y - r, c_y + r):
                for lz in range(tz - r, tz + r):
                     if (lx - tx)**2 + (ly - c_y)**2 + (lz - tz)**2 <= r**2:
                         self.octree.set_voxel(lx, ly, lz, PALETTE_MAP['leaves'])
