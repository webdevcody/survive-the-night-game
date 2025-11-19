import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface CarRepairEventData {
  playerId: number;
  amount: number;
}

export class CarRepairEvent implements GameEvent<CarRepairEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly amount: number;

  constructor(data: CarRepairEventData) {
    this.type = ServerSentEvents.CAR_REPAIR;
    this.playerId = data.playerId;
    this.amount = data.amount;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): CarRepairEventData {
    return { playerId: this.playerId, amount: this.amount };
  }

  getPlayerId(): number {
    return this.playerId;
  }

  getAmount(): number {
    return this.amount;
  }

  static serializeToBuffer(writer: BufferWriter, data: CarRepairEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeFloat64(data.amount ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): CarRepairEventData {
    const playerId = reader.readUInt16();
    const amount = reader.readFloat64();
    return { playerId, amount };
  }
}
