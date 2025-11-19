import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { ItemType } from "../../../util/inventory";

export interface PlaceStructureEventData {
  itemType: ItemType;
  position: { x: number; y: number };
}

export class PlaceStructureEvent implements GameEvent<PlaceStructureEventData> {
  private readonly type: EventType = ClientSentEvents.PLACE_STRUCTURE;
  private readonly data: PlaceStructureEventData;

  constructor(data: PlaceStructureEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): PlaceStructureEventData {
    return this.data;
  }

  getItemType(): ItemType {
    return this.data.itemType;
  }

  getPosition(): { x: number; y: number } {
    return this.data.position;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: PlaceStructureEventData): void {
    writer.writeString(String(data.itemType));
    const position = data.position ?? { x: 0, y: 0 };
    writer.writeFloat64(position.x ?? 0);
    writer.writeFloat64(position.y ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): PlaceStructureEventData {
    const itemType = reader.readString() as ItemType;
    const x = reader.readFloat64();
    const y = reader.readFloat64();
    return { itemType, position: { x, y } };
  }
}

