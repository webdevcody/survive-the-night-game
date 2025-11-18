import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { AdminCommand } from "../../../commands/commands";

export function serialize(args: any[]): ArrayBuffer | null {
  const command = args[0] as AdminCommand | undefined;
  if (!command) {
    return null;
  }

  const writer = new ArrayBufferWriter(256);
  writer.writeString(String(command.command));
  writer.writeString(command.password ?? "");
  const payloadString =
    command.payload !== undefined ? JSON.stringify(command.payload) : "null";
  writer.writeString(payloadString);
  return writer.getBuffer();
}

export function deserialize(buffer: ArrayBuffer): any[] | null {
  const reader = new BufferReader(buffer);
  const command = reader.readString();
  const password = reader.readString();
  const payloadRaw = reader.readString();
  let payload: unknown = null;
  if (payloadRaw.length > 0 && payloadRaw !== "null") {
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      payload = payloadRaw;
    }
  }
  const adminCommand: AdminCommand = {
    command: command as AdminCommand["command"],
    password,
    payload,
  };
  return [adminCommand];
}

