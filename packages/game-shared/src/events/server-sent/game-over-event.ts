import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export class GameOverEvent implements GameEvent<void> {
  private readonly type: EventType;

  constructor() {
    this.type = ServerSentEvents.GAME_OVER;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): void {
    return;
  }

  getGameState(): void {
    return;
  }

  static serializeToBuffer(_writer: BufferWriter, _data: void): void {
    // No payload events - zero-length buffer
  }

  static deserializeFromBuffer(_reader: BufferReader): void {
    // No payload events - return undefined
  }
}
