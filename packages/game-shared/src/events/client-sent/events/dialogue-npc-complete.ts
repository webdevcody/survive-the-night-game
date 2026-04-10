import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface DialogueNpcCompleteEventData {
  npcEntityId: number;
  /** When true, server only runs tryGrantQuestFromNpc (mid-dialogue); otherwise full completion (advance talk + grant). */
  grantQuestOnly?: boolean;
}

export class DialogueNpcCompleteEvent implements GameEvent<DialogueNpcCompleteEventData> {
  private readonly type: EventType = ClientSentEvents.DIALOGUE_NPC_COMPLETE;
  private readonly data: DialogueNpcCompleteEventData;

  constructor(data: DialogueNpcCompleteEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): DialogueNpcCompleteEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: DialogueNpcCompleteEventData): void {
    writer.writeUInt16(data.npcEntityId ?? 0);
    // 0 = grant only, 1 = full completion (default when omitted in JSON)
    writer.writeUInt8(data.grantQuestOnly ? 0 : 1);
  }

  static deserializeFromBuffer(reader: BufferReader): DialogueNpcCompleteEventData {
    const npcEntityId = reader.readUInt16();
    let grantQuestOnly = false;
    if (reader.hasMore()) {
      const phase = reader.readUInt8();
      grantQuestOnly = phase === 0;
    }
    return { npcEntityId, grantQuestOnly };
  }
}
