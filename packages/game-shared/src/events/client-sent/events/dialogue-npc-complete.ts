import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface DialogueNpcCompleteEventData {
  npcEntityId: number;
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
  }

  static deserializeFromBuffer(reader: BufferReader): DialogueNpcCompleteEventData {
    return { npcEntityId: reader.readUInt16() };
  }
}
