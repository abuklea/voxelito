from typing import Dict

CHUNK_SIZE = 32
PALETTE = [
  "air", "grass", "stone", "dirt", "water", "wood", "leaves", "sand",
  "brick", "roof", "glass", "plank", "concrete", "asphalt", "road_white",
  "road_yellow", "neon_blue", "neon_pink", "metal", "snow", "lava",
  "flower_red", "flower_yellow", "flower_purple", "shrub"
]
PALETTE_MAP = {name: i for i, name in enumerate(PALETTE)}

PALETTE_DESCRIPTIONS = {
    "air": "Empty space (use to clear areas)",
    "grass": "Green grassy terrain",
    "stone": "Gray natural stone",
    "dirt": "Brown soil",
    "water": "Blue water",
    "wood": "Brown wood log",
    "leaves": "Green leaves",
    "sand": "Yellow sand",
    "brick": "Red brick wall",
    "roof": "Dark brown roofing",
    "glass": "Transparent glass",
    "plank": "Light wood planks",
    "concrete": "Gray concrete",
    "asphalt": "Dark gray asphalt",
    "road_white": "Asphalt + white line",
    "road_yellow": "Asphalt + yellow line",
    "neon_blue": "Glowing blue",
    "neon_pink": "Glowing pink",
    "metal": "Shiny metal",
    "snow": "White snow",
    "lava": "Glowing lava",
    "flower_red": "Red Flower",
    "flower_yellow": "Yellow Flower",
    "flower_purple": "Purple Flower",
    "shrub": "Green shrub/bush"
}
