import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../events";

export interface BossStepEventData {
  bossId: number;
  intensity: number;
  durationMs: number;
}

export class BossStepEvent implements GameEvent<BossStepEventData> {
  private readonly type: EventType = ServerSentEvents.BOSS_STEP;
  constructor(private readonly data: BossStepEventData) {}

  getType(): EventType {
    return this.type;
  }

  getBossId(): number {
    return this.data.bossId;
  }

  getIntensity(): number {
    return this.data.intensity;
  }

  getDurationMs(): number {
    return this.data.durationMs;
  }

  serialize(): BossStepEventData {
    return this.data;
  }
}
