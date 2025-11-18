import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export function serialize(args: any[]): ArrayBuffer | null {
  const writer = new ArrayBufferWriter(256);
  const displayName = (args[0] ?? "") as string;
  writer.writeString(displayName);
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const displayName = reader.readString();
  return [displayName];
}

