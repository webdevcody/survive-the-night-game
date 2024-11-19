export type Vector2 = { x: number; y: number };

export function roundVector2(vector: Vector2): Vector2 {
  return { x: Math.round(vector.x), y: Math.round(vector.y) };
}
