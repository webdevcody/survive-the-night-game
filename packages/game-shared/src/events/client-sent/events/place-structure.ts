import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { ItemType } from "../../../util/inventory";

export function serialize(args: any[]): ArrayBuffer | null {
  const data = args[0] as
    | { itemType: ItemType; position: { x: number; y: number } }
    | undefined;
  if (!data) {
    return null;
  }

  const writer = new ArrayBufferWriter(256);
  writer.writeString(String(data.itemType));
  const position = data.position ?? { x: 0, y: 0 };
  writer.writeFloat64(position.x ?? 0);
  writer.writeFloat64(position.y ?? 0);
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const itemType = reader.readString() as ItemType;
  const x = reader.readFloat64();
  const y = reader.readFloat64();
  return [{ itemType, position: { x, y } }];
}

