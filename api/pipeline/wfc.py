import random
from typing import List, Dict, Set, Tuple, Optional
from enum import Enum

class ZoneType(str, Enum):
    EMPTY = "empty"
    ROAD = "road"
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    PARK = "park"
    WATER = "water"

class SemanticBlock:
    def __init__(self, x: int, y: int, z: int, zone: ZoneType):
        self.x = x
        self.y = y
        self.z = z
        self.zone = zone
        self.rotation = 0 # 0, 90, 180, 270

class WFCLayoutGenerator:
    """
    A simplified Wave Function Collapse generator for city layouts.
    Operates on a coarse grid (e.g., 50x50x50 units -> 5x5x5 blocks).
    """
    def __init__(self, width: int, height: int, depth: int):
        self.width = width
        self.height = height
        self.depth = depth
        self.grid: Dict[Tuple[int, int, int], ZoneType] = {}

        # Define weights for initial collapse
        self.weights = {
            ZoneType.EMPTY: 10,
            ZoneType.ROAD: 5,
            ZoneType.RESIDENTIAL: 20,
            ZoneType.COMMERCIAL: 5,
            ZoneType.PARK: 5,
            ZoneType.WATER: 2
        }

    def get_neighbors(self, x, y, z):
        dirs = [(1,0,0), (-1,0,0), (0,0,1), (0,0,-1)] # Horizontal neighbors priority
        neighbors = []
        for dx, dy, dz in dirs:
            nx, ny, nz = x+dx, y+dy, z+dz
            if 0 <= nx < self.width and 0 <= ny < self.height and 0 <= nz < self.depth:
                neighbors.append((nx, ny, nz))
        return neighbors

    def generate(self) -> List[SemanticBlock]:
        # 1. Initialize logic (Simple Growth Algorithm tailored for City)
        # Using a modified growth approach as full constraint propagation
        # for 3D WFC can be slow in Python without optimized C libraries.

        # Start with a main road
        road_y = 0 # Ground level

        # Simple "Road Network" generation (L-System like)
        cursor_x, cursor_z = self.width // 2, self.depth // 2
        self.grid[(cursor_x, road_y, cursor_z)] = ZoneType.ROAD

        open_set = [(cursor_x, road_y, cursor_z)]
        visited = set()
        visited.add((cursor_x, road_y, cursor_z))

        # Grow roads
        for _ in range(int(self.width * self.depth * 0.2)): # 20% density
            if not open_set: break
            cx, cy, cz = open_set.pop(0) # BFS for sprawl

            neighbors = self.get_neighbors(cx, cy, cz)
            random.shuffle(neighbors)

            for nx, ny, nz in neighbors:
                if (nx, ny, nz) in visited: continue

                # Chance to extend road
                if random.random() < 0.4:
                    self.grid[(nx, ny, nz)] = ZoneType.ROAD
                    visited.add((nx, ny, nz))
                    open_set.append((nx, ny, nz))
                else:
                    # Place building next to road
                    choice = random.choices(
                        [ZoneType.RESIDENTIAL, ZoneType.COMMERCIAL, ZoneType.PARK],
                        weights=[0.6, 0.2, 0.2]
                    )[0]
                    self.grid[(nx, ny, nz)] = choice
                    visited.add((nx, ny, nz))

        # Fill remaining gaps with PARK or EMPTY
        # (Implicitly empty if not in grid)

        blocks = []
        for (x, y, z), zone in self.grid.items():
            blocks.append(SemanticBlock(x, y, z, zone))

        return blocks
