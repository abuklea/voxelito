import type { VoxelChunkData } from '../types';

export interface MeshResult {
    vertices: Float32Array;
    indices: Uint32Array;
    voxelIds: Uint8Array;
}

export function greedyMesh(chunkData: Uint8Array, dimensions: [number, number, number]): MeshResult {
    const [width, height, depth] = dimensions;

    // Optimization: Check if chunk is empty
    let isEmpty = true;
    for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] !== 0) {
            isEmpty = false;
            break;
        }
    }
    if (isEmpty) {
        return {
            vertices: new Float32Array(0),
            indices: new Uint32Array(0),
            voxelIds: new Uint8Array(0)
        };
    }

    const vertices: number[] = [];
    const indices: number[] = [];
    const voxelIds: number[] = [];
    let indexOffset = 0;

    const getVoxel = (x: number, y: number, z: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) {
            return 0; // Air voxel
        }
        return chunkData[x + width * (y + height * z)];
    };

    // Iterate over the 3 dimensions (x, y, z)
    for (let d = 0; d < 3; ++d) {
        const u = (d + 1) % 3;
        const v = (d + 2) % 3;

        const x = [0, 0, 0];
        const dims = [width, height, depth];

        // Iterate over the dimension's layers
        for (x[d] = -1; x[d] < dims[d]; ) {
            // -- Create a 2D slice of the chunk for the current direction --
            const slice = new Int8Array(dims[u] * dims[v]);
            let n = 0;
            for (x[v] = 0; x[v] < dims[v]; ++x[v]) {
                for (x[u] = 0; x[u] < dims[u]; ++x[u]) {
                    const voxelType1 = getVoxel(x[0], x[1], x[2]);
                    x[d]++;
                    const voxelType2 = getVoxel(x[0], x[1], x[2]);
                    x[d]--;

                    if ((voxelType1 === 0) === (voxelType2 === 0)) {
                        slice[n++] = 0;
                    } else if (voxelType1 !== 0) {
                        slice[n++] = voxelType1;
                    } else {
                        slice[n++] = -voxelType2;
                    }
                }
            }

            x[d]++;

            // -- Greedy meshing on the 2D slice --
            n = 0;
            for (let j = 0; j < dims[v]; ++j) {
                for (let i = 0; i < dims[u]; ) {
                    const voxelType = slice[n];
                    if (voxelType) {
                        // Find the largest possible quad starting at (i, j)
                        let w = 1;
                        while (i + w < dims[u] && slice[n + w] === voxelType) {
                            w++;
                        }

                        let h = 1;
                        let done = false;
                        while (j + h < dims[v]) {
                            for (let k = 0; k < w; ++k) {
                                if (slice[n + k + h * dims[u]] !== voxelType) {
                                    done = true;
                                    break;
                                }
                            }
                            if (done) break;
                            h++;
                        }

                        // Add the quad's vertices and indices
                        x[u] = i;
                        x[v] = j;

                        const du = [0, 0, 0];
                        const dv = [0, 0, 0];

                        if (voxelType > 0) {
                            dv[v] = h;
                            du[u] = w;
                        } else {
                            du[v] = h;
                            dv[u] = w;
                        }

                        const v1 = [x[0], x[1], x[2]];
                        const v2 = [x[0] + du[0], x[1] + du[1], x[2] + du[2]];
                        const v3 = [x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]];
                        const v4 = [x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]];

                        vertices.push(...v1, ...v2, ...v3, ...v4);

                        const actualVoxelId = Math.abs(voxelType);
                        voxelIds.push(actualVoxelId, actualVoxelId, actualVoxelId, actualVoxelId);

                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
                        indices.push(indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;

                        // Mark the area as visited
                        for (let l = 0; l < h; ++l) {
                            for (let k = 0; k < w; ++k) {
                                slice[n + k + l * dims[u]] = 0;
                            }
                        }
                        i += w;
                        n += w;
                    } else {
                        i++;
                        n++;
                    }
                }
            }
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
        voxelIds: new Uint8Array(voxelIds)
    };
}

/**
 * Web Worker for generating voxel meshes using the Greedy Meshing algorithm.
 */
if (typeof self !== 'undefined') {
    self.onmessage = (event: MessageEvent<VoxelChunkData>) => {
        const { chunkData, dimensions, chunkId } = event.data;

        const result = greedyMesh(chunkData, dimensions);

        self.postMessage({
            vertices: result.vertices,
            indices: result.indices,
            voxelIds: result.voxelIds,
            chunkId: chunkId,
        }, [result.vertices.buffer, result.indices.buffer, result.voxelIds.buffer]);
    };
}
