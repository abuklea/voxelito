import os
import random
from PIL import Image, ImageDraw

OUTPUT_DIR = "public/textures"
SIZE = 64

PALETTE_COLORS = {
    "air": None,
    "grass": [(34, 139, 34), (50, 205, 50)],
    "stone": [(128, 128, 128), (105, 105, 105)],
    "dirt": [(139, 69, 19), (160, 82, 45)],
    "water": [(65, 105, 225), (30, 144, 255)],
    "wood": [(101, 67, 33), (139, 69, 19)],
    "leaves": [(0, 100, 0), (0, 128, 0)],
    "sand": [(238, 214, 175), (210, 180, 140)],
    "brick": [(178, 34, 34), (128, 0, 0)],
    "roof": [(100, 50, 50), (120, 60, 60)],
    "glass": [(173, 216, 230, 128), (224, 255, 255, 128)],
    "plank": [(222, 184, 135), (210, 180, 140)],
    "concrete": [(169, 169, 169), (192, 192, 192)],
    "asphalt": [(50, 50, 50), (40, 40, 40)],
    "road_white": [(200, 200, 200), (220, 220, 220)],
    "road_yellow": [(255, 215, 0), (255, 255, 0)],
    "neon_blue": [(0, 255, 255), (0, 200, 255)],
    "neon_pink": [(255, 20, 147), (255, 105, 180)],
    "metal": [(119, 136, 153), (112, 128, 144)],
    "snow": [(255, 250, 250), (240, 248, 255)],
    "lava": [(255, 69, 0), (255, 140, 0)],
}

def generate_noise(base_color, variation=20):
    r, g, b = base_color[:3]
    noise = random.randint(-variation, variation)
    nr = max(0, min(255, r + noise))
    ng = max(0, min(255, g + noise))
    nb = max(0, min(255, b + noise))
    if len(base_color) > 3:
        return (nr, ng, nb, base_color[3])
    return (nr, ng, nb)

def create_texture(name, base_colors, num_variations=2):
    if not base_colors: return

    for v in range(num_variations):
        img = Image.new('RGBA', (SIZE, SIZE))
        pixels = img.load()

        base = base_colors[v % len(base_colors)]

        # Simple noise pattern
        for x in range(SIZE):
            for y in range(SIZE):
                pixels[x, y] = generate_noise(base)

        # Add some simple patterns
        draw = ImageDraw.Draw(img)
        if "brick" in name:
            # Draw lines
            draw.line([(0, SIZE/2), (SIZE, SIZE/2)], fill=(0,0,0,100), width=2)
            draw.line([(SIZE/2, 0), (SIZE/2, SIZE/2)], fill=(0,0,0,100), width=2)
            draw.line([(SIZE/4, SIZE/2), (SIZE/4, SIZE)], fill=(0,0,0,100), width=2)
            draw.line([(3*SIZE/4, SIZE/2), (3*SIZE/4, SIZE)], fill=(0,0,0,100), width=2)

        if "wood" in name or "plank" in name:
             # Vertical lines
             for i in range(0, SIZE, 8):
                 draw.line([(i, 0), (i, SIZE)], fill=(50, 30, 10, 50), width=1)

        if "leaves" in name:
             # Random dots
             for _ in range(50):
                 x = random.randint(0, SIZE-1)
                 y = random.randint(0, SIZE-1)
                 pixels[x, y] = (0, 80, 0)

        filename = f"{name}_{v+1}.png"
        img.save(os.path.join(OUTPUT_DIR, filename))
        print(f"Generated {filename}")

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for name, colors in PALETTE_COLORS.items():
        if colors:
            create_texture(name, colors, num_variations=2)

if __name__ == "__main__":
    main()
