import * as THREE from 'three';
import { normalFromHeight } from './normalFromHeight';

/**
 * Procedural ripple normals for the pool. A sum of sine waves whose wave numbers are
 * whole, so the pattern tiles seamlessly however small the texture is.
 */
const SIZE = 256;

const WAVES: Array<{ kx: number; ky: number; amplitude: number; phase: number }> = [
  { kx: 3, ky: 1, amplitude: 1, phase: 0 },
  { kx: -2, ky: 3, amplitude: 0.72, phase: 1.1 },
  { kx: 5, ky: -4, amplitude: 0.42, phase: 2.4 },
  { kx: 7, ky: 6, amplitude: 0.24, phase: 0.6 },
  { kx: -9, ky: 2, amplitude: 0.16, phase: 3.1 }
];

export function createWaterNormals(): THREE.CanvasTexture {
  const height = document.createElement('canvas');
  height.width = height.height = SIZE;
  const context = height.getContext('2d');
  if (!context) {
    return new THREE.CanvasTexture(height);
  }

  const image = context.createImageData(SIZE, SIZE);
  const total = WAVES.reduce((sum, wave) => sum + wave.amplitude, 0);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let value = 0;
      for (const wave of WAVES) {
        value +=
          wave.amplitude *
          Math.sin(((wave.kx * x + wave.ky * y) / SIZE) * Math.PI * 2 + wave.phase);
      }
      const level = Math.round(((value / total) * 0.5 + 0.5) * 255);
      const index = (y * SIZE + x) * 4;
      image.data[index] = level;
      image.data[index + 1] = level;
      image.data[index + 2] = level;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(normalFromHeight(height, 2.2));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
