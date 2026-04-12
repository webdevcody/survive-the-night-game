import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

/** 0 = hotbar key 4, 1 = hotbar key 5 */
export interface UseLoadoutConsumableEventData {
  which: 0 | 1;
}

export class UseLoadoutConsumableEvent implements GameEvent<UseLoadoutConsumableEventData> {
  private readonly type: EventType = ClientSentEvents.USE_LOADOUT_CONSUMABLE;
  private readonly data: UseLoadoutConsumableEventData;

  constructor(data: UseLoadoutConsumableEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): UseLoadoutConsumableEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: UseLoadoutConsumableEventData): void {
    const w = data.which === 1 ? 1 : 0;
    writer.writeUInt8(w);
  }

  static deserializeFromBuffer(reader: BufferReader): UseLoadoutConsumableEventData {
    const raw = reader.readUInt8();
    const which: 0 | 1 = raw === 1 ? 1 : 0;
    return { which };
  }
}
