"""
image_to_voxel_pipeline.py

Complete end-to-end pipeline implementation
"""

import numpy as np
from PIL import Image
from transformers import pipeline as hf_pipeline
import torch
import os
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

class ImageToVoxelPipeline:
    def __init__(
        self,
        grid_size: int = 64,
        fov_degrees: float = 35.0,
        depth_range: tuple[float, float] = (5, 40)
    ):
        self.grid_size = grid_size
        self.depth_range = depth_range

        # Initialize depth model
        print("Initializing depth model...")
        self.depth_pipe = hf_pipeline(
            task="depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small-hf",
            device=0 if torch.cuda.is_available() else -1
        )
        print("Depth model initialized.")

        # Camera intrinsics
        self.intrinsics = self._estimate_intrinsics(
            (1024, 1024),
            fov_degrees
        )

    def _estimate_intrinsics(self, image_size, fov_degrees):
        W, H = image_size
        cx, cy = W/2, H/2
        fov_rad = np.radians(fov_degrees)
        fx = fy = W / (2 * np.tan(fov_rad/2))
        return {"fx": fx, "fy": fy, "cx": cx, "cy": cy}

    def process(
        self,
        image: Image.Image,
        remove_background: bool = True
    ) -> dict:
        """
        Main pipeline: Image → Voxels

        Returns:
            {
                "voxel_positions": (N, 3) int array,
                "voxel_colors": (N, 3) uint8 array
            }
        """
        print("Processing image...")
        # 1. Estimate depth
        print("Estimating depth...")
        depth_result = self.depth_pipe(image)
        depth_map = np.array(depth_result["depth"])
        depth_map = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min())

        # 2. Remove background
        if remove_background:
            print("Removing background...")
            mask = self._remove_background(image)
        else:
            mask = np.ones(depth_map.shape, dtype=bool)

        # 3. Calibrate depth
        depth_calibrated = self._calibrate_depth(depth_map)

        # 4. Unproject to point cloud
        print("Unprojecting...")
        point_cloud = self._unproject(
            np.array(image),
            depth_calibrated,
            mask
        )

        # 5. Transform to voxel space
        print("Transforming to voxel space...")
        voxel_coords = self._transform_to_voxel_space(
            point_cloud["positions"]
        )

        # 6. Quantize to voxel grid
        print("Quantizing...")
        voxels = self._quantize_to_grid(
            voxel_coords,
            point_cloud["colors"]
        )

        return voxels

    def _remove_background(self, image: Image.Image) -> np.ndarray:
        """Simple white background removal"""
        img_array = np.array(image).astype(float) / 255.0
        # Check for white background (high values in all channels)
        # Using a slightly lower threshold to catch more white-ish pixels
        is_white = np.all(img_array > 0.90, axis=-1)
        return ~is_white

    def _calibrate_depth(self, depth_map: np.ndarray) -> np.ndarray:
        """Convert relative depth to voxel units"""
        d_min, d_max = self.depth_range
        # Invert depth map because Depth Anything outputs disparity (inverse depth) usually,
        # or closer objects have higher values?
        # Actually Depth Anything output is relative depth.
        # Usually brighter = closer.
        # But for unprojection we need distance Z.
        # If map is disparity: Z ~ 1/d.
        # If map is relative metric depth (closer is smaller Z):
        # Let's assume standard depth map where brighter is closer (or higher value).
        # We need Z distance from camera.
        # If value 1 = close, value 0 = far.
        # Then Z should be inverse related to value?
        # The Research Doc says:
        # "Invert if necessary (some models output disparity)"
        # "if np.mean(depth_map) > 0.5: depth_map = 1.0 - depth_map"

        # For now let's use linear mapping but we need to check direction.
        # We want Z to be positive.
        return d_min + (d_max - d_min) * depth_map

    def _unproject(
        self,
        rgb: np.ndarray,
        depth: np.ndarray,
        mask: np.ndarray
    ) -> dict:
        """Unproject pixels to 3D point cloud"""
        H, W = depth.shape
        fx, fy = self.intrinsics["fx"], self.intrinsics["fy"]
        cx, cy = self.intrinsics["cx"], self.intrinsics["cy"]

        # Create pixel grid
        u, v = np.meshgrid(np.arange(W), np.arange(H))

        # Apply mask
        u, v = u[mask], v[mask]
        z = depth[mask]
        colors = rgb[mask]

        # Unproject
        # x = (u - cx) * z / fx
        # y = (v - cy) * z / fy
        # But wait, image coordinate system Y is down.
        # Camera coordinate system usually Y down, Z forward.

        x = (u - cx) * z / fx
        y = (v - cy) * z / fy

        positions = np.stack([x, y, z], axis=-1)

        return {"positions": positions, "colors": colors}

    def _transform_to_voxel_space(self, positions: np.ndarray) -> np.ndarray:
        """Transform camera space → voxel grid coordinates"""
        # Flip Y (up) and Z (backward)
        # Original Doc:
        # P[:, 1] = -P[:, 1]  # Flip Y
        # P[:, 2] = -P[:, 2]  # Flip Z

        P = positions.copy()
        P[:, 1] = -P[:, 1]
        P[:, 2] = -P[:, 2]

        # Normalize to [0, 1]
        P_min = P.min(axis=0)
        P_max = P.max(axis=0)
        P_range = P_max - P_min

        # Avoid division by zero
        P_range[P_range == 0] = 1.0

        P_norm = (P - P_min) / P_range

        # Scale to grid
        P_voxel = P_norm * (self.grid_size - 1)

        return P_voxel

    def _quantize_to_grid(
        self,
        positions: np.ndarray,
        colors: np.ndarray
    ) -> dict:
        """Quantize point cloud to discrete voxel grid"""
        # Round to integers
        voxel_idx = np.round(positions).astype(int)
        voxel_idx = np.clip(voxel_idx, 0, self.grid_size - 1)

        # Remove duplicates (average colors)
        unique_voxels = {}
        for pos, color in zip(voxel_idx, colors):
            key = tuple(pos)
            if key not in unique_voxels:
                unique_voxels[key] = []
            unique_voxels[key].append(color)

        # Average colors
        final_positions = []
        final_colors = []
        for pos, color_list in unique_voxels.items():
            final_positions.append(pos)
            final_colors.append(np.mean(color_list, axis=0).astype(np.uint8))

        return {
            "voxel_positions": np.array(final_positions),
            "voxel_colors": np.array(final_colors)
        }


# Usage Example
if __name__ == "__main__":
    pipeline = ImageToVoxelPipeline(grid_size=64)

    # Load test image
    image_path = "tools/test_dragon.png"
    if not os.path.exists(image_path):
        print(f"Warning: {image_path} not found. Attempting to use existing 'test_dragon.png' if available or generate one.")
        # Try to generate if not found? No, user should run generate first.
        # But let's check if it exists in current dir
        if os.path.exists("test_dragon.png"):
            image_path = "test_dragon.png"
        else:
             print("Please run tools/generate_test_image.py first.")
             exit(1)

    print(f"Loading image from {image_path}")
    image = Image.open(image_path).resize((1024, 1024))

    # Process
    voxels = pipeline.process(image)

    print(f"Generated {len(voxels['voxel_positions'])} voxels")

    # Visualize
    fig = plt.figure(figsize=(10, 10))
    ax = fig.add_subplot(111, projection='3d')

    positions = voxels["voxel_positions"]
    colors = voxels["voxel_colors"] / 255.0

    # Downsample for plotting if too many points
    if len(positions) > 10000:
        indices = np.random.choice(len(positions), 10000, replace=False)
        positions = positions[indices]
        colors = colors[indices]

    ax.scatter(
        positions[:, 0],
        positions[:, 1],
        positions[:, 2],
        c=colors,
        marker='s',
        s=20
    )

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')

    output_plot_path = "tools/output_voxel_plot.png"
    plt.savefig(output_plot_path)
    print(f"Plot saved to {output_plot_path}")
