import os
import sys
import numpy as np
from PIL import Image, ImageDraw
import argparse
import time
import json

# Try importing heavy dependencies
try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers/torch not found. Running in dummy mode.")

# --- Configuration & Constants ---

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

PALETTE_NAMES = list(PALETTE_HEX.keys())

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

PALETTE_RGB = np.array([hex_to_rgb(PALETTE_HEX[name]) for name in PALETTE_NAMES])

# --- Components ---

class ImageGenerator:
    def __init__(self, api_key=None, dummy=False):
        self.dummy = dummy
        self.api_key = api_key

    def generate(self, prompt, size=(512, 512)):
        if self.dummy:
            print(f"Generating dummy image for prompt: {prompt}")
            img = Image.new('RGB', size, color='white')
            draw = ImageDraw.Draw(img)
            # Draw a red sphere-like circle in the middle
            cx, cy = size[0]//2, size[1]//2
            r = size[0]//3
            draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(255, 0, 0))
            return img
        else:
            # TODO: Implement OpenAI API call
            # from openai import OpenAI
            # client = OpenAI(api_key=self.api_key)
            # response = client.images.generate(...)
            print("Real image generation not implemented in prototype, using dummy.")
            return self.generate(prompt, size)

class DepthEstimator:
    def __init__(self, model_id="depth-anything/Depth-Anything-V2-Small-hf", dummy=False):
        self.dummy = dummy
        self.pipe = None
        if not self.dummy and TRANSFORMERS_AVAILABLE:
            print(f"Loading Depth Model: {model_id}...")
            try:
                device = "cpu" # Force CPU for sandbox stability
                self.pipe = pipeline(task="depth-estimation", model=model_id, device=device)
            except Exception as e:
                print(f"Failed to load model: {e}. Falling back to dummy.")
                self.dummy = True

    def estimate(self, image):
        if self.dummy:
            print("Estimating dummy depth...")
            # Create a radial gradient (center is close/bright, edges far/dark)
            w, h = image.size
            x = np.linspace(-1, 1, w)
            y = np.linspace(-1, 1, h)
            xv, yv = np.meshgrid(x, y)
            d = 1.0 - np.sqrt(xv**2 + yv**2)
            d = np.clip(d, 0, 1)
            # Convert to PIL Image
            depth_img = Image.fromarray((d * 255).astype(np.uint8))
            return depth_img

        # Real estimation
        print("Running depth inference...")
        depth = self.pipe(image)["depth"]
        return depth

class VoxelProjector:
    def __init__(self, scene_size=128):
        self.scene_size = scene_size

    def find_nearest_material(self, rgb_array):
        # rgb_array: (N, 3)
        # PALETTE_RGB: (M, 3)
        # Find index of nearest color
        # Simple Euclidean distance
        # Using broadcasting: (N, 1, 3) - (1, M, 3) -> (N, M, 3)
        # This might be memory heavy for large images. Processing line by line or chunking is better.
        # For prototype (512x512 = 262k pixels), we'll do it purely on valid voxels.
        pass

    def project(self, image, depth_map, fov_deg=45.0, threshold=0.1):
        """
        Projects image + depth into a list of (x, y, z, mat_idx)
        """
        w, h = image.size
        # Resize depth to match image if needed
        if depth_map.size != image.size:
            depth_map = depth_map.resize(image.size)

        img_arr = np.array(image) # (H, W, 3)
        depth_arr = np.array(depth_map).astype(np.float32) / 255.0 # (H, W) Normalized 0-1

        # Camera Intrinsics
        # f = (W/2) / tan(fov/2)
        f_x = (w / 2.0) / np.tan(np.deg2rad(fov_deg / 2.0))
        f_y = (h / 2.0) / np.tan(np.deg2rad(fov_deg / 2.0))
        c_x = w / 2.0
        c_y = h / 2.0

        # Grid Setup
        voxels = {} # (x,y,z) -> material_index

        print(f"Projecting {w}x{h} pixels...")

        # Optimization: Filter out background (infinite depth or white color)
        # Let's assume white background in image means empty
        # Threshold for white: R>240 and G>240 and B>240
        mask_fg = (img_arr[:, :, 0] < 250) | (img_arr[:, :, 1] < 250) | (img_arr[:, :, 2] < 250)

        # Get indices of foreground pixels
        y_idxs, x_idxs = np.where(mask_fg)

        if len(y_idxs) == 0:
            print("No foreground pixels found.")
            return []

        # Process standard depth
        # Map depth 0..1 to Z world coordinates
        # Let's say scene depth is 100 voxels.
        # Z_cam = some_base + depth_val * scale
        # But commonly depth maps are inverse depth or just relative.
        # Let's assume linear mapping for now: 0 (black) is far, 1 (white) is close.
        # Wait, usually white is close in depth maps.
        # Let's map 0..1 to Z range [20, 120]
        z_min, z_max = 20.0, 120.0

        z_vals = z_max - (depth_arr[y_idxs, x_idxs] * (z_max - z_min))

        # Unproject
        # x = (u - cx) * z / fx
        # y = (v - cy) * z / fy
        # In our coordinate system:
        # standard 3D: Y is up. Image: Y is down.
        # Let's flip Y.

        x_3d = (x_idxs - c_x) * z_vals / f_x
        y_3d = -(y_idxs - c_y) * z_vals / f_y # Flip Y
        z_3d = z_vals

        # Quantize to integer coordinates
        # Center them
        ix = np.round(x_3d).astype(int)
        iy = np.round(y_3d).astype(int)
        iz = np.round(z_3d).astype(int)

        # Get colors
        colors = img_arr[y_idxs, x_idxs]

        # Batch match colors
        # This is the slow part if done naively.
        # For N pixels and M palette colors:
        # dist = sum((color - palette)^2)

        # Simple closest color
        # We can use KDTree or just broadcasting for small palette
        # Broadcast: (N, 1, 3) - (1, M, 3)
        N = len(colors)
        if N > 0:
            # Chunking to avoid OOM
            chunk_size = 10000
            material_indices = np.zeros(N, dtype=int)

            for i in range(0, N, chunk_size):
                end = min(i + chunk_size, N)
                chunk_colors = colors[i:end] # (C, 3)
                # (C, 1, 3) - (1, M, 3) -> (C, M, 3)
                diff = chunk_colors[:, np.newaxis, :] - PALETTE_RGB[np.newaxis, :, :]
                dists = np.sum(diff**2, axis=2) # (C, M)
                material_indices[i:end] = np.argmin(dists, axis=1)

            # Fill voxel dict
            for k in range(N):
                key = (ix[k], iy[k], iz[k])
                # Simple z-buffering strategy: closest pixel overwrites?
                # Or just keep last?
                # Since we iterate arbitrary, let's just write.
                voxels[key] = material_indices[k]

        return voxels

# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Image to Voxel Prototype")
    parser.add_argument("--prompt", type=str, default="A red sphere")
    parser.add_argument("--dummy", action="store_true", help="Force dummy mode")
    args = parser.parse_args()

    print("--- Image to Voxel Research Prototype ---")

    # 1. Generate Image
    img_gen = ImageGenerator(dummy=args.dummy)
    image = img_gen.generate(args.prompt)
    image.save("debug_input_image.png")
    print("Saved debug_input_image.png")

    # 2. Estimate Depth
    depth_est = DepthEstimator(dummy=args.dummy)
    depth = depth_est.estimate(image)
    if isinstance(depth, Image.Image):
        depth.save("debug_depth_map.png")
    else:
        # It might be a tensor or numpy array if from pipeline
        # convert to image for saving
        # pipe output is usually PIL image
        pass
    print("Saved debug_depth_map.png")

    # 3. Project
    projector = VoxelProjector()
    voxels = projector.project(image, depth)

    print(f"Generated {len(voxels)} voxels.")

    if len(voxels) > 0:
        # Analyze bounds
        ks = np.array(list(voxels.keys()))
        min_b = np.min(ks, axis=0)
        max_b = np.max(ks, axis=0)
        print(f"Bounds: Min {min_b}, Max {max_b}")
        print(f"Size: {max_b - min_b}")

        # Save simple JSON
        output_data = {
            "voxels": [{"x": int(k[0]), "y": int(k[1]), "z": int(k[2]), "m": int(v)} for k, v in voxels.items()]
        }
        with open("debug_output_voxels.json", "w") as f:
            json.dump(output_data, f)
        print("Saved debug_output_voxels.json")

if __name__ == "__main__":
    main()
