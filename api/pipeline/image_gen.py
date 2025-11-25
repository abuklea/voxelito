import os
import asyncio
import logging
import math
from io import BytesIO
import numpy as np
from PIL import Image, ImageDraw

from api.common import PALETTE_RGB, PALETTE
from api.voxel_utils import VoxelGrid, convert_grid_to_chunks, CHUNK_SIZE

logger = logging.getLogger(__name__)

# Check for dependencies
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not found. Running in dummy mode.")

try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers/Torch not found. Running in dummy mode.")

class ImageGenerator:
    def __init__(self, api_key=None, dummy=False):
        self.dummy = dummy or not OPENAI_AVAILABLE
        self.client = None
        if not self.dummy:
            self.client = AsyncOpenAI(api_key=api_key)

    async def generate(self, prompt: str, size="1024x1024"):
        if self.dummy:
            logger.info(f"Generating dummy image for: {prompt}")
            await asyncio.sleep(1) # Simulate delay
            img = Image.new('RGB', (512, 512), color='white')
            draw = ImageDraw.Draw(img)
            cx, cy = 256, 256
            r = 150
            color = (255, 0, 0)
            if "blue" in prompt.lower(): color = (0, 0, 255)
            elif "green" in prompt.lower(): color = (0, 255, 0)

            # Draw shape based on view
            if "back view" in prompt.lower():
                 # Draw a square for back view to distinguish
                 draw.rectangle((cx-r, cy-r, cx+r, cy+r), fill=color)
            else:
                 draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=color)
            return img

        try:
            logger.info(f"Calling DALL-E 3 for: {prompt}")
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality="standard",
                n=1,
            )
            import httpx
            async with httpx.AsyncClient() as client:
                r = await client.get(response.data[0].url)
                return Image.open(BytesIO(r.content))
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            # Fallback to dummy
            self.dummy = True
            return await self.generate(prompt, size)

class DepthEstimator:
    def __init__(self, dummy=False):
        self.dummy = dummy or not TRANSFORMERS_AVAILABLE
        self.pipe = None
        if not self.dummy:
            try:
                # Use CPU to avoid GPU OOM in sandbox or if CUDA unavailable
                device = "cpu"
                if torch.cuda.is_available():
                    device = "cuda"
                logger.info(f"Loading Depth Anything V2 on {device}...")
                self.pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=device)
            except Exception as e:
                logger.error(f"Failed to load depth model: {e}")
                self.dummy = True

    def estimate(self, image: Image.Image):
        if self.dummy:
            w, h = image.size
            # Dummy depth: Cone shape
            x = np.linspace(-1, 1, w)
            y = np.linspace(-1, 1, h)
            xv, yv = np.meshgrid(x, y)
            d = 1.0 - np.sqrt(xv**2 + yv**2)
            d = np.clip(d, 0, 1)
            return d # Returns numpy array 0..1

        result = self.pipe(image)
        depth = np.array(result["depth"])
        # Normalize to 0..1
        depth = (depth - depth.min()) / (depth.max() - depth.min())
        return depth

class VoxelProjector:
    def __init__(self, grid_size=64):
        self.grid_size = grid_size
        # Convert palette to numpy for fast matching
        self.palette_rgb = np.array(PALETTE_RGB) # (M, 3)

    def project(self, image: Image.Image, depth_map: np.ndarray, view_matrix=None, thickness=0):
        """
        Project image+depth to world points.
        Returns: (points_world, colors)
        points_world: (N, 3) float
        colors: (N, 3) uint8
        """
        w, h = image.size
        img_arr = np.array(image)

        # 1. Background Removal
        mask_fg = (img_arr[:, :, 0] < 250) | (img_arr[:, :, 1] < 250) | (img_arr[:, :, 2] < 250)
        y_idxs, x_idxs = np.where(mask_fg)

        if len(y_idxs) == 0:
            return np.empty((0, 3)), np.empty((0, 3))

        # 2. Unproject to Camera Space
        fov_deg = 45.0
        f_x = (w / 2.0) / np.tan(np.deg2rad(fov_deg / 2.0))
        f_y = (h / 2.0) / np.tan(np.deg2rad(fov_deg / 2.0))
        c_x = w / 2.0
        c_y = h / 2.0

        # Depth Mapping
        z_min, z_max = 10.0, 50.0
        d_vals = depth_map[y_idxs, x_idxs]
        base_z_camera = z_max - (d_vals * (z_max - z_min)) # 1->min(close), 0->max(far)

        # Thickness Extrusion
        # We repeat the pixels `thickness` times, adding to Z each time
        # This is memory intensive for large thickness, but ok for small (2-5)

        # Prepare lists to concatenate
        all_z = [base_z_camera]
        for t in range(1, thickness + 1):
            all_z.append(base_z_camera + t) # Extrude deeper

        # We also need to duplicate x_idxs, y_idxs, colors
        # Efficient way: Repeat indices
        num_pixels = len(base_z_camera)
        total_points = num_pixels * (thickness + 1)

        # Tile indices and colors
        # (N,) -> (N * T,)
        # Note: we need to pair (x,y) with (z, z+1...).
        # np.tile([1,2], 2) -> [1,2,1,2].
        # But we want z to change.
        # Let's stack z arrays: (T, N) -> flatten -> (T*N,)
        z_camera_combined = np.concatenate(all_z)

        # Tile x, y, colors T times
        # np.tile tiles the whole array.
        x_idxs_combined = np.tile(x_idxs, thickness + 1)
        y_idxs_combined = np.tile(y_idxs, thickness + 1)

        colors_subset = img_arr[y_idxs, x_idxs]
        colors_combined = np.tile(colors_subset, (thickness + 1, 1))

        # Re-calculate X, Y for new Zs (perspective correct thickness)
        x_camera = (x_idxs_combined - c_x) * z_camera_combined / f_x
        y_camera = (y_idxs_combined - c_y) * z_camera_combined / f_y

        points_camera = np.stack([x_camera, y_camera, z_camera_combined, np.ones(total_points)], axis=1)

        # 3. Transform to World Space
        if view_matrix is None:
            view_matrix = np.eye(4)

        points_world = (view_matrix @ points_camera.T).T # (N, 4)

        return points_world[:, :3], colors_combined

    def match_materials(self, colors):
        N = len(colors)
        chunk_s = 5000
        mat_indices = np.zeros(N, dtype=int)
        for i in range(0, N, chunk_s):
            end = min(i+chunk_s, N)
            c_chunk = colors[i:end]
            diff = c_chunk[:, np.newaxis, :] - self.palette_rgb[np.newaxis, :, :]
            dists = np.sum(diff**2, axis=2)
            mat_indices[i:end] = np.argmin(dists, axis=1)
        return mat_indices


class ImageToVoxelPipeline:
    def __init__(self, grid_size=64):
        api_key = os.environ.get("OPENAI_API_KEY")
        self.generator = ImageGenerator(api_key=api_key)
        self.estimator = DepthEstimator()
        self.projector = VoxelProjector(grid_size=grid_size)
        self.grid_size = grid_size

    async def run(self, prompt: str, multi_view=False):
        logger.info(f"Pipeline Start. Multi-view: {multi_view}")

        views = [] # (image, depth, matrix)

        # 1. Front View
        prompt_front = f"Isometric view, {prompt}, diorama style, orthographic projection, 3D render, white background"
        img_front = await self.generator.generate(prompt_front)
        depth_front = self.estimator.estimate(img_front)
        views.append((img_front, depth_front, np.eye(4))) # Identity

        if multi_view:
            # 2. Back View
            prompt_back = f"Isometric view, back view of {prompt}, diorama style, orthographic projection, 3D render, white background"
            img_back = await self.generator.generate(prompt_back)
            depth_back = self.estimator.estimate(img_back)

            # Rotation Matrix for Back View (180 deg around Y)
            theta = np.pi
            c, s = np.cos(theta), np.sin(theta)
            R_back = np.array([
                [c, 0, s, 0],
                [0, 1, 0, 0],
                [-s, 0, c, 0],
                [0, 0, 0, 1]
            ])
            views.append((img_back, depth_back, R_back))

        # 3. Collect Points
        all_points = []
        all_colors = []

        # Thickness: 3 if single view, 0 if multi-view (since we have back)
        thickness = 3 if not multi_view else 0

        for img, depth, mat in views:
            pts, cols = self.projector.project(img, depth, view_matrix=mat, thickness=thickness)
            all_points.append(pts)
            all_colors.append(cols)

        combined_points = np.concatenate(all_points, axis=0)
        combined_colors = np.concatenate(all_colors, axis=0)

        if len(combined_points) == 0:
            return []

        # 4. Global Centering and Scaling
        # We want the object to fit in the grid (0..64).
        # Find bounds
        min_p = np.min(combined_points, axis=0)
        max_p = np.max(combined_points, axis=0)
        center_p = (min_p + max_p) / 2.0

        # Center at Grid Center
        grid_center = np.array([self.grid_size/2, self.grid_size/2, self.grid_size/2])
        points_centered = combined_points - center_p + grid_center

        # Flip Y (Voxel Up is +Y, Camera/Image Up is -Y usually)
        # Flip relative to center
        points_centered[:, 1] = (grid_center[1] * 2) - points_centered[:, 1]

        # 5. Quantize
        ix = np.round(points_centered[:, 0]).astype(int)
        iy = np.round(points_centered[:, 1]).astype(int)
        iz = np.round(points_centered[:, 2]).astype(int)

        # Filter out of bounds
        mask = (ix >= 0) & (ix < self.grid_size) & \
               (iy >= 0) & (iy < self.grid_size) & \
               (iz >= 0) & (iz < self.grid_size)

        ix = ix[mask]
        iy = iy[mask]
        iz = iz[mask]
        colors_final = combined_colors[mask]

        # 6. Color Match and Voxelize
        mat_indices = self.projector.match_materials(colors_final)

        grid = VoxelGrid()
        for i in range(len(ix)):
            grid.set_voxel(ix[i], iy[i], iz[i], mat_indices[i])

        # 7. Convert to Chunks
        chunks = convert_grid_to_chunks(grid.chunks)
        logger.info(f"Pipeline Complete. Generated {len(chunks)} chunks.")
        return chunks

# Test block
if __name__ == "__main__":
    async def test():
        pipeline = ImageToVoxelPipeline()
        # Test Multi-View
        chunks = await pipeline.run("A red car", multi_view=True)
        print(f"Generated {len(chunks)} chunks (Multi-View)")

        # Test Single View
        chunks_s = await pipeline.run("A blue tree", multi_view=False)
        print(f"Generated {len(chunks_s)} chunks (Single-View)")

    asyncio.run(test())
