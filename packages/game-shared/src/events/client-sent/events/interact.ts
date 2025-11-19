import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface InteractEventData {
  targetEntityId?: number | null;
}

export class InteractEvent implements GameEvent<InteractEventData> {
  private readonly type: EventType = ClientSentEvents.INTERACT;
  private readonly data: InteractEventData;

  constructor(data: InteractEventData = {}) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): InteractEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: InteractEventData): void {
    const hasTarget = data.targetEntityId !== undefined && data.targetEntityId !== null;
    writer.writeUInt8(hasTarget ? 1 : 0);
    if (hasTarget) {
      writer.writeUInt16(data.targetEntityId!);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): InteractEventData {
    const hasTarget = reader.readUInt8() === 1;
    let targetEntityId: number | null | undefined = undefined;
    if (hasTarget) {
      targetEntityId = reader.readUInt16();
    }
    return { targetEntityId };
  }
}

