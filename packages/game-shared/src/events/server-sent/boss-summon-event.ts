import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../events";

export interface BossSummonEventData {
  bossId: number;
  summons: Array<{ x: number; y: number }>;
}

export class BossSummonEvent implements GameEvent<BossSummonEventData> {
  private readonly type: EventType = ServerSentEvents.BOSS_SUMMON;

  constructor(private readonly data: BossSummonEventData) {}

  getType(): EventType {
    return this.type;
  }

  getBossId(): number {
    return this.data.bossId;
  }

  getSummons(): Array<{ x: number; y: number }> {
    return this.data.summons;
  }

  serialize(): BossSummonEventData {
    return this.data;
  }
}
