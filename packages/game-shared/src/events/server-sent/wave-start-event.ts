import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export interface WaveStartEventData {
  waveNumber: number;
}

export class WaveStartEvent implements GameEvent<WaveStartEventData> {
  private readonly type: EventType;
  private readonly data: WaveStartEventData;

  constructor(data: WaveStartEventData) {
    this.type = ServerSentEvents.WAVE_START;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): WaveStartEventData {
    return this.data;
  }

  getData(): WaveStartEventData {
    return this.data;
  }

  getWaveNumber(): number {
    return this.data.waveNumber;
  }
}

