import sys
import os
import asyncio
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# Add root to path
sys.path.append(os.getcwd())

from api.pipeline.image_gen import ImageToVoxelPipeline
from api.common import PALETTE_RGB

def plot_voxels(chunks, filename):
    # Decode chunks
    points = []
    colors = []

    # Simple palette map (index -> rgb)
    palette = np.array(PALETTE_RGB) / 255.0

    print(f"Decoding {len(chunks)} chunks for {filename}...")

    total_voxels = 0
    for chunk in chunks:
        # chunk is ChunkResponse object
        cx, cy, cz = chunk.position
        rle = chunk.rle_data

        parts = rle.split(',')
        idx = 0
        for part in parts:
            if ':' not in part: continue
            val, count = map(int, part.split(':'))

            if val != 0: # 0 is air
                # decode positions
                # Chunk size is 32
                # But optimized: only compute if we need to
                # We can iterate k
                for k in range(count):
                    # Local index to x,y,z
                    # index = x + y*32 + z*32*32
                    current_idx = idx + k
                    lx = current_idx % 32
                    ly = (current_idx // 32) % 32
                    lz = (current_idx // (32*32)) % 32

                    x = cx * 32 + lx
                    y = cy * 32 + ly
                    z = cz * 32 + lz

                    points.append([x, y, z])
                    if val > 0 and val < len(palette):
                        colors.append(palette[val])
                    else:
                        colors.append([0.5, 0.5, 0.5]) # Gray fallback
                    total_voxels += 1

            idx += count

    print(f"Total voxels: {total_voxels}")
    points = np.array(points)
    colors = np.array(colors)

    if len(points) == 0:
        print(f"No voxels to plot for {filename}")
        return

    fig = plt.figure(figsize=(10, 10))
    ax = fig.add_subplot(111, projection='3d')

    # Downsample if too many points for matplotlib
    if len(points) > 10000:
        indices = np.random.choice(len(points), 10000, replace=False)
        points = points[indices]
        colors = colors[indices]

    ax.scatter(points[:, 0], points[:, 1], points[:, 2], c=colors, marker='s', s=20)

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')

    # Set limits to grid size roughly
    ax.set_xlim(0, 64)
    ax.set_ylim(0, 64)
    ax.set_zlim(0, 64)

    plt.title(f"Voxel Visualization: {filename}")
    plt.savefig(f"docs/screenshots/{filename}")
    print(f"Saved docs/screenshots/{filename}")
    plt.close()

async def run_test():
    print("Initializing Pipeline...")
    pipeline = ImageToVoxelPipeline()

    print("Running Multi-View Test (Red)...")
    chunks_mv = await pipeline.run("A red car", multi_view=True)
    plot_voxels(chunks_mv, "pipeline_result_multiview.png")

    print("Running Single-View Test (Blue)...")
    chunks_sv = await pipeline.run("A blue tree", multi_view=False)
    plot_voxels(chunks_sv, "pipeline_result_singleview.png")

if __name__ == "__main__":
    if not os.path.exists("docs/screenshots"):
        os.makedirs("docs/screenshots")
    asyncio.run(run_test())
