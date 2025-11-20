import type { VoxelChunkData } from '../types';

self.onmessage = (event: MessageEvent<VoxelChunkData>) => {
    const { chunkData, dimensions } = event.data;
    const [width, height, depth] = dimensions;

    const vertices: number[] = [];
    const indices: number[] = [];
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

    const verticesArray = new Float32Array(vertices);
    const indicesArray = new Uint32Array(indices);

    self.postMessage({
        vertices: verticesArray,
        indices: indicesArray,
        chunkId: event.data.chunkId,
    }, [verticesArray.buffer, indicesArray.buffer]);
};
