import * as THREE from 'three';
import { normalFromHeight } from './normalFromHeight';

/**
 * Procedural pine grain, drawn on a canvas at load time like the slate.
 *
 * Every timber piece is a box whose faces are mapped from 0 to 1, and every batten of
 * the sauna is about 80 mm across for lengths of a metre or more. The grain is therefore
 * drawn as long streaks along U, the length of the piece, and its density across V is
 * what the eye reads as the width of the board. Stretching along the length is exactly
 * what wood does, so the mapping needs no per piece adjustment.
 *
 * Three maps come out of it: colour, normal and roughness. The colour map stays close to
 * white, because it multiplies the colour of the material it is applied to.
 */
const WIDTH = 1024;
const HEIGHT = 256;
const STREAKS = 46;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface WoodCanvases {
  colour: HTMLCanvasElement;
  height: HTMLCanvasElement;
  roughness: HTMLCanvasElement;
}

function drawGrain(): WoodCanvases {
  const colour = document.createElement('canvas');
  const height = document.createElement('canvas');
  const roughness = document.createElement('canvas');
  for (const canvas of [colour, height, roughness]) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
  }

  const paint = colour.getContext('2d');
  const relief = height.getContext('2d');
  const rough = roughness.getContext('2d');
  if (!paint || !relief || !rough) {
    return { colour, height, roughness };
  }

  paint.fillStyle = '#f2ece2';
  paint.fillRect(0, 0, WIDTH, HEIGHT);
  relief.fillStyle = '#c8c8c8';
  relief.fillRect(0, 0, WIDTH, HEIGHT);
  rough.fillStyle = '#b4b4b4';
  rough.fillRect(0, 0, WIDTH, HEIGHT);

  const random = seeded(19850214);

  // Broad tonal bands: the piece is not the same colour from edge to edge.
  for (let band = 0; band < 7; band += 1) {
    const top = random() * HEIGHT;
    const depth = 12 + random() * 46;
    const shade = 0.06 + random() * 0.07;
    const gradient = paint.createLinearGradient(0, top, 0, top + depth);
    gradient.addColorStop(0, `rgba(150, 110, 66, 0)`);
    gradient.addColorStop(0.5, `rgba(150, 110, 66, ${shade.toFixed(3)})`);
    gradient.addColorStop(1, `rgba(150, 110, 66, 0)`);
    paint.fillStyle = gradient;
    paint.fillRect(0, top, WIDTH, depth);
  }

  // Grain lines. Each one wanders slightly along the length, as a sawn board does.
  for (let streak = 0; streak < STREAKS; streak += 1) {
    const base = (streak + random() * 0.7) * (HEIGHT / STREAKS);
    const strength = 0.1 + random() * 0.4;
    const thickness = 0.6 + random() * 2.1;
    const wobble = 1.5 + random() * 5;
    const period = 220 + random() * 700;
    const phase = random() * Math.PI * 2;

    const trace = (context: CanvasRenderingContext2D, style: string, lineWidth: number): void => {
      context.strokeStyle = style;
      context.lineWidth = lineWidth;
      context.beginPath();
      for (let x = 0; x <= WIDTH; x += 8) {
        const y = base + Math.sin((x / period) * Math.PI * 2 + phase) * wobble;
        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();
    };

    trace(paint, `rgba(118, 84, 48, ${(strength * 0.55).toFixed(3)})`, thickness);
    trace(relief, `rgba(40, 40, 40, ${(strength * 0.8).toFixed(3)})`, thickness);
    trace(rough, `rgba(255, 255, 255, ${(strength * 0.6).toFixed(3)})`, thickness);
  }

  return { colour, height, roughness };
}

export interface WoodTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function createWoodTextures(): WoodTextures {
  const { colour, height, roughness } = drawGrain();
  const map = new THREE.CanvasTexture(colour);
  const normalMap = new THREE.CanvasTexture(normalFromHeight(height, 3));
  const roughnessMap = new THREE.CanvasTexture(roughness);

  for (const texture of [map, normalMap, roughnessMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
  }
  map.colorSpace = THREE.SRGBColorSpace;

  return { map, normalMap, roughnessMap };
}
