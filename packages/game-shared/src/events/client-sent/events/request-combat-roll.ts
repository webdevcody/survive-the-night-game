import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface RequestCombatRollEventData {
  angle: number;
}

export class RequestCombatRollEvent implements GameEvent<RequestCombatRollEventData> {
  private readonly type: EventType = ClientSentEvents.REQUEST_COMBAT_ROLL;
  private readonly data: RequestCombatRollEventData;

  constructor(data: RequestCombatRollEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): RequestCombatRollEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: RequestCombatRollEventData): void {
    let angle = Number.isFinite(data.angle) ? data.angle : 0;
    angle = angle % (2 * Math.PI);
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    writer.writeUInt16(Math.round((angle / (2 * Math.PI)) * 65535));
  }

  static deserializeFromBuffer(reader: BufferReader): RequestCombatRollEventData {
    const angleScaled = reader.readUInt16();
    return {
      angle: (angleScaled / 65535) * (2 * Math.PI),
    };
  }
}
