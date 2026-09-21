/** Positions evenly spread between two bounds, never exceeding `maxSpacing`. */
export function evenPositions(start: number, end: number, maxSpacing: number): number[] {
  const span = end - start;
  if (span <= 0 || maxSpacing <= 0) {
    return [start];
  }
  const intervals = Math.max(1, Math.ceil(span / maxSpacing));
  const step = span / intervals;
  const positions: number[] = [];
  for (let index = 0; index <= intervals; index += 1) {
    positions.push(start + index * step);
  }
  return positions;
}

/** Centres of `count` items of `size` spread evenly over a span, gaps included. */
export function distributedCenters(start: number, end: number, size: number, gap: number): number[] {
  const span = end - start;
  const pitch = size + gap;
  const count = Math.max(1, Math.floor((span + gap) / pitch));
  const used = count * pitch - gap;
  const margin = (span - used) / 2;
  const centers: number[] = [];
  for (let index = 0; index < count; index += 1) {
    centers.push(start + margin + index * pitch + size / 2);
  }
  return centers;
}
