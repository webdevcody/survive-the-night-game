import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { VotableGameMode } from "../../../types/voting";

export interface VoteGameModeEventData {
  mode: VotableGameMode;
}

export class VoteGameModeEvent implements GameEvent<VoteGameModeEventData> {
  private readonly type: EventType = ClientSentEvents.VOTE_GAME_MODE;
  private readonly data: VoteGameModeEventData;

  constructor(data: VoteGameModeEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): VoteGameModeEventData {
    return this.data;
  }

  getMode(): VotableGameMode {
    return this.data.mode;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: VoteGameModeEventData): void {
    writer.writeString(data.mode);
  }

  static deserializeFromBuffer(reader: BufferReader): VoteGameModeEventData {
    const mode = reader.readString() as VotableGameMode;
    return { mode };
  }
}
