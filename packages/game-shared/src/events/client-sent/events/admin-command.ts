import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { AdminCommand } from "../../../commands/commands";

export interface AdminCommandEventData {
  command: AdminCommand["command"];
  password: string;
  payload: unknown;
}

export class AdminCommandEvent implements GameEvent<AdminCommandEventData> {
  private readonly type: EventType = ClientSentEvents.ADMIN_COMMAND;
  private readonly data: AdminCommandEventData;

  constructor(data: AdminCommandEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): AdminCommandEventData {
    return this.data;
  }

  getCommand(): AdminCommand["command"] {
    return this.data.command;
  }

  getPassword(): string {
    return this.data.password;
  }

  getPayload(): unknown {
    return this.data.payload;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: AdminCommandEventData): void {
    writer.writeString(String(data.command));
    writer.writeString(data.password ?? "");
    const payloadString = data.payload !== undefined ? JSON.stringify(data.payload) : "null";
    writer.writeString(payloadString);
  }

  static deserializeFromBuffer(reader: BufferReader): AdminCommandEventData {
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
    return {
      command: command as AdminCommand["command"],
      password,
      payload,
    };
  }
}
