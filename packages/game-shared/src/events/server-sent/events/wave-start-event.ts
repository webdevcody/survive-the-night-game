import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface WaveStartEventData {
  waveNumber: number;
  startTime?: number;
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

  static serializeToBuffer(writer: BufferWriter, data: WaveStartEventData): void {
    const waveNumber = data.waveNumber ?? 0;
    if (waveNumber > 255) {
      throw new Error(`waveNumber ${waveNumber} exceeds uint8 maximum (255)`);
    }
    writer.writeUInt8(waveNumber);
    writer.writeFloat64(data.startTime ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): WaveStartEventData {
    const waveNumber = reader.readUInt8();
    const startTime = reader.readFloat64();
    return { waveNumber, startTime };
  }
}
