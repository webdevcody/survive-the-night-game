export function linearFalloff(distance: number, maxDistance: number): number {
  return Math.max(0, 1 - distance / maxDistance);
}
