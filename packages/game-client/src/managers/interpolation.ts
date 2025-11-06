import Vector2 from "@shared/util/vector2";

type Snapshot = { position: Vector2; timestamp: number };

const MAX_SNAPSHOTS = 3; // Keep last 3 snapshots for interpolation

export class InterpolationManager {
  private snapshots: Map<string, Snapshot[]> = new Map();

  addSnapshot(entityId: string, position: Vector2, timestamp: number): void {
    const list = this.snapshots.get(entityId) || [];
    list.push({ position, timestamp });
    // Keep only most recent snapshots
    while (list.length > MAX_SNAPSHOTS) list.shift();
    this.snapshots.set(entityId, list);
  }

  getInterpolatedPosition(entityId: string, now: number = Date.now()): Vector2 | null {
    const list = this.snapshots.get(entityId);
    if (!list || list.length === 0) return null;

    const renderTime = now;

    // Find two snapshots around renderTime
    let prev = list[0];
    let next = list[list.length - 1];

    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (a.timestamp <= renderTime && renderTime <= b.timestamp) {
        prev = a;
        next = b;
        break;
      }
    }

    const span = next.timestamp - prev.timestamp;
    if (span <= 0) return next.position;
    const t = Math.min(1, Math.max(0, (renderTime - prev.timestamp) / span));
    return new Vector2(
      prev.position.x + (next.position.x - prev.position.x) * t,
      prev.position.y + (next.position.y - prev.position.y) * t
    );
  }
}
