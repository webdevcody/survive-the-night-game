import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export function serialize(args: any[]): ArrayBuffer | null {
  const data = args[0] as { merchantId: number; itemIndex: number } | undefined;
  if (!data) {
    return null;
  }

  const writer = new ArrayBufferWriter(256);
  writer.writeUInt16(data.merchantId ?? 0);
  writer.writeUInt32(Math.max(0, Math.trunc(data.itemIndex ?? 0)));
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const merchantId = reader.readUInt16();
  const itemIndex = reader.readUInt32();
  return [{ merchantId, itemIndex }];
}

