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
