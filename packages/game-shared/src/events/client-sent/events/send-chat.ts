import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export function serialize(args: any[]): ArrayBuffer | null {
  const data = args[0] as { message: string } | undefined;
  if (!data) {
    return null;
  }

  const writer = new ArrayBufferWriter(256);
  writer.writeString(data.message ?? "");
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const message = reader.readString();
  return [{ message }];
}

