import Vector2 from "@shared/util/vector2";
import { getInterpolationConfig } from "@/config/client-prediction";

type Snapshot = { position: Vector2; timestamp: number };

type InterpolationConfig = {
  delayMs: number;
  maxSnapshots: number;
};

export class InterpolationManager {
  private snapshots: Map<string, Snapshot[]> = new Map();

  constructor(config: Partial<InterpolationConfig> = {}) {
    // Constructor kept for API compatibility, but config is now dynamic
  }

  /**
   * Get current config, reading from window.config.predictions if available
   */
  private getCurrentConfig(): InterpolationConfig {
    return getInterpolationConfig();
  }

  addSnapshot(entityId: string, position: Vector2, timestamp: number): void {
    const config = this.getCurrentConfig();
    const list = this.snapshots.get(entityId) || [];
    list.push({ position, timestamp });
    // Keep only most recent snapshots
    while (list.length > config.maxSnapshots) list.shift();
    this.snapshots.set(entityId, list);
  }

  getInterpolatedPosition(entityId: string, now: number = Date.now()): Vector2 | null {
    const config = this.getCurrentConfig();
    const list = this.snapshots.get(entityId);
    if (!list || list.length === 0) return null;

    const renderTime = now - config.delayMs;

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
