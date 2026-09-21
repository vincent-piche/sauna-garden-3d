/**
 * The whole configuration is expressed in millimetres.
 * Conversion to Three.js units happens only when geometry is created,
 * so that no scene code has to know about the modelling scale.
 *
 * 1 Three.js unit = 1 metre.
 */
export const MILLIMETRES_PER_UNIT = 1000;

export function mm(millimetres: number): number {
  return millimetres / MILLIMETRES_PER_UNIT;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
