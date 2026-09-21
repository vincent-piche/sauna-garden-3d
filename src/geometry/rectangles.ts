export interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

const EPSILON = 0.5; // mm, below this a fragment is not worth modelling

function overlaps(a: Rect, b: Rect): boolean {
  return a.u0 < b.u1 - EPSILON && a.u1 > b.u0 + EPSILON && a.v0 < b.v1 - EPSILON && a.v1 > b.v0 + EPSILON;
}

function isUsable(rect: Rect): boolean {
  return rect.u1 - rect.u0 > EPSILON && rect.v1 - rect.v0 > EPSILON;
}

function subtractOne(rect: Rect, hole: Rect): Rect[] {
  if (!overlaps(rect, hole)) {
    return [rect];
  }
  const pieces: Rect[] = [
    { u0: rect.u0, u1: Math.min(rect.u1, hole.u0), v0: rect.v0, v1: rect.v1 },
    { u0: Math.max(rect.u0, hole.u1), u1: rect.u1, v0: rect.v0, v1: rect.v1 },
    {
      u0: Math.max(rect.u0, hole.u0),
      u1: Math.min(rect.u1, hole.u1),
      v0: rect.v0,
      v1: Math.min(rect.v1, hole.v0)
    },
    {
      u0: Math.max(rect.u0, hole.u0),
      u1: Math.min(rect.u1, hole.u1),
      v0: Math.max(rect.v0, hole.v1),
      v1: rect.v1
    }
  ];
  return pieces.filter(isUsable);
}

/** Guillotine subtraction: returns the parts of `rect` that are not covered by any hole. */
export function subtractRects(rect: Rect, holes: readonly Rect[]): Rect[] {
  let remaining = isUsable(rect) ? [rect] : [];
  for (const hole of holes) {
    const next: Rect[] = [];
    for (const piece of remaining) {
      next.push(...subtractOne(piece, hole));
    }
    remaining = next;
  }
  return remaining;
}

/** Splits a span into strips of at most `stripWidth`, the last one taking the remainder. */
export function splitIntoStrips(start: number, end: number, stripWidth: number): Array<{ u0: number; u1: number }> {
  const strips: Array<{ u0: number; u1: number }> = [];
  const total = end - start;
  if (total <= EPSILON || stripWidth <= EPSILON) {
    return strips;
  }
  const count = Math.max(1, Math.ceil(total / stripWidth));
  const actualWidth = total / count;
  for (let index = 0; index < count; index += 1) {
    strips.push({ u0: start + index * actualWidth, u1: start + (index + 1) * actualWidth });
  }
  return strips;
}
