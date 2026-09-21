import * as THREE from 'three';
import { normalFromHeight } from './normalFromHeight';

/**
 * Procedural slate roofing, drawn on a canvas at load time.
 * No external image is used: the courses, the bond and the tone of each slate are
 * generated from a fixed seed, so the roof always looks the same.
 */
const TEXTURE_SIZE = 512;
const COURSES = 6;
const SLATES_PER_COURSE = 5;
const BASE_COLOR: [number, number, number] = [58, 65, 72];

/** Small deterministic generator, so a reload never reshuffles the roof. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function tone(base: [number, number, number], shift: number): string {
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return `rgb(${clamp(base[0] + shift)}, ${clamp(base[1] + shift * 1.05)}, ${clamp(base[2] + shift * 1.15)})`;
}

interface SlateCanvases {
  color: HTMLCanvasElement;
  height: HTMLCanvasElement;
}

function drawSlates(): SlateCanvases {
  const color = document.createElement('canvas');
  const height = document.createElement('canvas');
  color.width = color.height = TEXTURE_SIZE;
  height.width = height.height = TEXTURE_SIZE;

  const paint = color.getContext('2d');
  const relief = height.getContext('2d');
  if (!paint || !relief) {
    return { color, height };
  }

  paint.fillStyle = tone(BASE_COLOR, -26);
  paint.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  relief.fillStyle = '#202020';
  relief.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const courseHeight = TEXTURE_SIZE / COURSES;
  const slateWidth = TEXTURE_SIZE / SLATES_PER_COURSE;
  const random = seeded(20260921);

  for (let course = 0; course < COURSES; course += 1) {
    // Every other course is offset by half a slate: the classic broken bond.
    const offset = course % 2 === 0 ? 0 : slateWidth / 2;
    const top = course * courseHeight;

    for (let slate = -1; slate <= SLATES_PER_COURSE; slate += 1) {
      const left = slate * slateWidth + offset;
      const inset = 1.5;
      const shade = (random() - 0.5) * 26;
      const slateTop = top + inset * 0.5;
      const slateHeight = courseHeight - inset;
      const slateWidthDrawn = slateWidth - inset;

      paint.fillStyle = tone(BASE_COLOR, shade);
      paint.fillRect(left + inset / 2, slateTop, slateWidthDrawn, slateHeight);

      // The exposed lower edge of a slate catches the light, the joint above it is dark.
      const gradient = paint.createLinearGradient(0, slateTop, 0, slateTop + slateHeight);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
      gradient.addColorStop(0.22, 'rgba(0, 0, 0, 0.05)');
      gradient.addColorStop(0.88, 'rgba(255, 255, 255, 0.04)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.11)');
      paint.fillStyle = gradient;
      paint.fillRect(left + inset / 2, slateTop, slateWidthDrawn, slateHeight);

      const step = relief.createLinearGradient(0, slateTop, 0, slateTop + slateHeight);
      step.addColorStop(0, '#3a3a3a');
      step.addColorStop(0.3, '#b4b4b4');
      step.addColorStop(1, '#f0f0f0');
      relief.fillStyle = step;
      relief.fillRect(left + inset / 2, slateTop, slateWidthDrawn, slateHeight);
    }
  }

  return { color, height };
}

export interface SlateTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  /** Size of the patch drawn above, in millimetres, used to set the repeat. */
  patchSize: { width: number; height: number };
}

export function createSlateTextures(): SlateTextures {
  const { color, height } = drawSlates();
  const map = new THREE.CanvasTexture(color);
  const normalMap = new THREE.CanvasTexture(normalFromHeight(height, 6));

  for (const texture of [map, normalMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
  }
  map.colorSpace = THREE.SRGBColorSpace;

  // Five slates of 300 mm across and six courses of 180 mm exposed.
  return { map, normalMap, patchSize: { width: SLATES_PER_COURSE * 300, height: COURSES * 180 } };
}
