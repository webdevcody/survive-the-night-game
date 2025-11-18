import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export class GameStartedEvent implements GameEvent<void> {
  constructor() {}

  public getType() {
    return ServerSentEvents.GAME_STARTED;
  }

  public serialize(): void {
    return undefined;
  }

  static serializeToBuffer(_writer: BufferWriter, _data: void): void {
    // No payload events - zero-length buffer
  }

  static deserializeFromBuffer(_reader: BufferReader): void {
    // No payload events - return undefined
  }
}
