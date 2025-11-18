import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export function serialize(args: any[]): ArrayBuffer | null {
  const writer = new ArrayBufferWriter(256);
  const latency = Number(args[0] ?? 0);
  writer.writeFloat64(latency);
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const latency = reader.readFloat64();
  return [latency];
}

