import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export type ProgressionAllocationKind = "skill" | "character";

export interface SetProgressionAllocationsEventData {
  kind: ProgressionAllocationKind;
  /** Full allocation map (reset = {}) */
  allocations: Record<string, number>;
}

export class SetProgressionAllocationsEvent implements GameEvent<SetProgressionAllocationsEventData> {
  private readonly type: EventType = ClientSentEvents.SET_PROGRESSION_ALLOCATIONS;
  private readonly data: SetProgressionAllocationsEventData;

  constructor(data: SetProgressionAllocationsEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SetProgressionAllocationsEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SetProgressionAllocationsEventData): void {
    const kindByte = data.kind === "skill" ? 0 : 1;
    writer.writeUInt8(kindByte);
    writer.writeString(JSON.stringify(data.allocations ?? {}));
  }

  static deserializeFromBuffer(reader: BufferReader): SetProgressionAllocationsEventData {
    const kindByte = reader.readUInt8();
    const kind: ProgressionAllocationKind = kindByte === 0 ? "skill" : "character";
    const raw = reader.readString();
    let allocations: Record<string, number> = {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        allocations = parsed as Record<string, number>;
      }
    } catch {
      allocations = {};
    }
    return { kind, allocations };
  }
}
