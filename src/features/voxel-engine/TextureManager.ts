import * as THREE from 'three';
import type { VoxelType } from '../../types';
import { palette } from './palette';

const TEXTURE_SIZE = 64;
const VARIATIONS = 2;

export interface TextureAtlasResult {
  texture: THREE.Texture;
  idToUV: Record<number, { u: number; v: number; su: number; sv: number }>;
  typeToIds: Record<string, number[]>;
}

export async function generateTextureAtlas(): Promise<TextureAtlasResult> {
  // Load all textures
  const modules = import.meta.glob('../../assets/textures/*.png', { eager: true, as: 'url' });

  const voxelTypes = Object.keys(palette) as VoxelType[];
  // Filter out air
  const renderableTypes = voxelTypes.filter(t => t !== 'air');

  const totalTextures = renderableTypes.length * VARIATIONS;
  const cols = 8;
  const rows = Math.ceil(totalTextures / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * TEXTURE_SIZE;
  canvas.height = rows * TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  const idToUV: Record<number, { u: number; v: number; su: number; sv: number }> = {};
  const typeToIds: Record<string, number[]> = {};

  let currentId = 1; // 0 is air
  let slotIndex = 0;

  // Helper to load image
  const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  for (const type of renderableTypes) {
    typeToIds[type] = [];
    for (let v = 1; v <= VARIATIONS; v++) {
       const fileName = `../../assets/textures/${type}_${v}.png`;
       const src = modules[fileName];
       if (src) {
           try {
               const img = await loadImage(src);
               const col = slotIndex % cols;
               const row = Math.floor(slotIndex / cols);

               ctx.drawImage(img, col * TEXTURE_SIZE, row * TEXTURE_SIZE, TEXTURE_SIZE, TEXTURE_SIZE);

               // UVs
               // u, v is bottom-left (Three.js)? Top-left (Canvas)?
               // Three.js UVs: (0,0) is bottom-left. Canvas (0,0) is top-left.
               // We need to flip Y if we map directly, or just be careful.
               // Usually simple: u = col / cols, v = 1 - (row + 1) / rows (for bottom-left origin)
               // Let's assume standard mapping:

               const u = col / cols;
               const v = 1 - ((row + 1) / rows); // Bottom of the slot
               const su = 1 / cols;
               const sv = 1 / rows;

               idToUV[currentId] = { u, v, su, sv };
               typeToIds[type].push(currentId);
               currentId++;
               slotIndex++;
           } catch (e) {
               console.error(`Failed to load texture ${fileName}`, e);
           }
       } else {
           console.warn(`Texture not found: ${fileName}`);
       }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  return { texture, idToUV, typeToIds };
}
