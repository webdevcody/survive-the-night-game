import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { ItemType } from "../../../util/inventory";
import { itemTypeRegistry } from "../../../util/item-type-encoding";

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
    writer.writeUInt8(itemTypeRegistry.encode(String(data.itemType)));
    const position = data.position ?? { x: 0, y: 0 };
    // Use Position2 (4 bytes) instead of 2x Float64 (16 bytes)
    writer.writePosition2({ x: position.x ?? 0, y: position.y ?? 0 });
  }

  static deserializeFromBuffer(reader: BufferReader): PlaceStructureEventData {
    const itemType = itemTypeRegistry.decode(reader.readUInt8()) as ItemType;
    const position = reader.readPosition2();
    return { itemType, position: { x: position.x, y: position.y } };
  }
}

