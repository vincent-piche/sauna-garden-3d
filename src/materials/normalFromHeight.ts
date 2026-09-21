/**
 * Converts a grayscale height canvas into a tangent space normal map, by finite
 * differences. Shared by every procedural material of the project.
 *
 * Sampling wraps around the edges, so a tiling height map yields a tiling normal map.
 */
export function normalFromHeight(height: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const width = height.width;
  const depth = height.height;
  const normal = document.createElement('canvas');
  normal.width = width;
  normal.height = depth;

  const source = height.getContext('2d');
  const target = normal.getContext('2d');
  if (!source || !target) {
    return normal;
  }

  const input = source.getImageData(0, 0, width, depth).data;
  const output = target.createImageData(width, depth);
  const at = (x: number, y: number): number =>
    input[(((y + depth) % depth) * width + ((x + width) % width)) * 4] / 255;

  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const index = (y * width + x) * 4;
      output.data[index] = ((-dx / length) * 0.5 + 0.5) * 255;
      output.data[index + 1] = ((-dy / length) * 0.5 + 0.5) * 255;
      output.data[index + 2] = (1 / length) * 0.5 * 255 + 127.5;
      output.data[index + 3] = 255;
    }
  }
  target.putImageData(output, 0, 0);
  return normal;
}
