import * as THREE from 'three';

/**
 * Shapes are written in model coordinates (X and Z, in millimetres) and converted
 * to geometry by `layFlat`, which rotates the XY plane of the shape onto the ground
 * with its normal pointing up. The vertical coordinate of the shape is therefore
 * stored negated, which `roundedRect` does on its own.
 */
export function roundedRect(
  centerX: number,
  centerZ: number,
  length: number,
  width: number,
  radius: number
): THREE.Shape {
  const limit = Math.max(0, Math.min(radius, length / 2, width / 2));
  const x0 = centerX - length / 2;
  const x1 = centerX + length / 2;
  // Negated so that the flattened geometry lands on the right side of the model.
  const v0 = -(centerZ - width / 2);
  const v1 = -(centerZ + width / 2);
  const step = Math.sign(v1 - v0) * limit;

  const shape = new THREE.Shape();
  shape.moveTo(x0 + limit, v0);
  shape.lineTo(x1 - limit, v0);
  shape.quadraticCurveTo(x1, v0, x1, v0 + step);
  shape.lineTo(x1, v1 - step);
  shape.quadraticCurveTo(x1, v1, x1 - limit, v1);
  shape.lineTo(x0 + limit, v1);
  shape.quadraticCurveTo(x0, v1, x0, v1 - step);
  shape.lineTo(x0, v0 + step);
  shape.quadraticCurveTo(x0, v0, x0 + limit, v0);
  return shape;
}

/** Millimetre shape to a horizontal geometry in Three.js units, normal pointing up. */
export function layFlat(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.scale(0.001, 0.001, 0.001);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * Outline of the pool, as a closed spline through control points read off the
 * photograph: narrower at the ladder end, widening into a rounded bulge at the other,
 * with a step on the side facing the sauna. Coordinates are normalised so the shape
 * scales with the length and the width of the basin.
 */
const POOL_PROFILE: Array<[number, number]> = [
  [-0.5, -0.2],
  [-0.38, -0.3],
  [-0.18, -0.33],
  [0.02, -0.33],
  [0.16, -0.42],
  [0.34, -0.47],
  [0.46, -0.38],
  [0.5, -0.14],
  [0.5, 0.18],
  [0.4, 0.42],
  [0.18, 0.5],
  [-0.06, 0.46],
  [-0.28, 0.38],
  [-0.44, 0.26],
  [-0.5, 0.04]
];

const POOL_SAMPLES = 96;

export function poolOutline(
  centerX: number,
  centerZ: number,
  length: number,
  width: number
): THREE.Vector2[] {
  const control = POOL_PROFILE.map(
    ([u, v]) => new THREE.Vector3(centerX + u * length, -(centerZ + v * width), 0)
  );
  const curve = new THREE.CatmullRomCurve3(control, true, 'catmullrom', 0.5);
  return curve.getPoints(POOL_SAMPLES).map((point) => new THREE.Vector2(point.x, point.y));
}

function signedArea(points: readonly THREE.Vector2[]): number {
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total += current.x * next.y - next.x * current.y;
  }
  return total / 2;
}

/**
 * Moves every vertex of a closed polygon along its outward normal.
 * Good enough for a coping or a basin wall, whose offset is small compared with the
 * curvature; it is not a robust offset and would fold on a sharp concave corner.
 */
export function offsetPolygon(points: readonly THREE.Vector2[], distance: number): THREE.Vector2[] {
  const ordered = signedArea(points) < 0 ? [...points].reverse() : [...points];
  const count = ordered.length;
  const result: THREE.Vector2[] = [];

  for (let index = 0; index < count; index += 1) {
    const previous = ordered[(index - 1 + count) % count];
    const next = ordered[(index + 1) % count];
    const tangent = new THREE.Vector2(next.x - previous.x, next.y - previous.y);
    if (tangent.lengthSq() === 0) {
      result.push(ordered[index].clone());
      continue;
    }
    tangent.normalize();
    result.push(
      new THREE.Vector2(ordered[index].x + tangent.y * distance, ordered[index].y - tangent.x * distance)
    );
  }
  return result;
}
