import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface CarRepairEventData {
  carId: number;
  playerId?: number;
  amount?: number;
}

export class CarRepairEvent implements GameEvent<CarRepairEventData> {
  private readonly type: EventType;
  private readonly carId: number;
  private readonly playerId?: number;
  private readonly amount?: number;

  constructor(data: CarRepairEventData | number) {
    this.type = ServerSentEvents.CAR_REPAIR;
    // Support both old format (just carId number) and new format (object)
    if (typeof data === "number") {
      this.carId = data;
    } else {
      this.carId = data.carId;
      this.playerId = data.playerId;
      this.amount = data.amount;
    }
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): CarRepairEventData {
    return { carId: this.carId, playerId: this.playerId, amount: this.amount };
  }

  getCarId(): number {
    return this.carId;
  }

  getPlayerId(): number | undefined {
    return this.playerId;
  }

  getAmount(): number | undefined {
    return this.amount;
  }

  static serializeToBuffer(writer: BufferWriter, data: CarRepairEventData): void {
    writer.writeUInt16(data.carId ?? 0);
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeFloat64(data.amount ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): CarRepairEventData {
    const carId = reader.readUInt16();
    const playerId = reader.readUInt16();
    const amount = reader.readFloat64();
    return { carId, playerId, amount };
  }
}
