import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface DialogueNpcCompleteEventData {
  npcEntityId: number;
  acceptQuest?: boolean;
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
    writer.writeUInt8(data.acceptQuest === false ? 0 : 1);
  }

  static deserializeFromBuffer(reader: BufferReader): DialogueNpcCompleteEventData {
    const npcEntityId = reader.readUInt16();
    let acceptQuest: boolean | undefined;
    if (reader.hasMore()) {
      acceptQuest = reader.readUInt8() !== 0;
    }
    return acceptQuest === undefined ? { npcEntityId } : { npcEntityId, acceptQuest };
  }
}
