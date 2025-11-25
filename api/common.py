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

PALETTE_HEX = {
  "air": "#000000",
  "grass": "#00ff00",
  "stone": "#808080",
  "dirt": "#964B00",
  "water": "#4fa4b8",
  "wood": "#6d4c41",
  "leaves": "#4caf50",
  "sand": "#fdd835",
  "brick": "#b71c1c",
  "roof": "#5d4037",
  "glass": "#81d4fa",
  "plank": "#ffcc80",
  "concrete": "#9e9e9e",
  "asphalt": "#424242",
  "road_white": "#eeeeee",
  "road_yellow": "#ffeb3b",
  "neon_blue": "#00e5ff",
  "neon_pink": "#f50057",
  "metal": "#607d8b",
  "snow": "#ffffff",
  "lava": "#ff5722",
  "flower_red": "#f44336",
  "flower_yellow": "#ffeb3b",
  "flower_purple": "#9c27b0",
  "shrub": "#388e3c",
}

def _hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

PALETTE_RGB = [_hex_to_rgb(PALETTE_HEX[name]) for name in PALETTE]
