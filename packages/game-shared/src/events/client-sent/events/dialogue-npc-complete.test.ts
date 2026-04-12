import { describe, expect, it } from "vitest";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { DialogueNpcCompleteEvent } from "./dialogue-npc-complete";

describe("DialogueNpcCompleteEvent", () => {
  it("round-trips a declined quest decision through the binary payload", () => {
    const writer = new ArrayBufferWriter();
    DialogueNpcCompleteEvent.serializeToBuffer(writer, {
      npcEntityId: 42,
      acceptQuest: false,
    });

    const data = DialogueNpcCompleteEvent.deserializeFromBuffer(
      new BufferReader(writer.getBuffer()),
    );

    expect(data).toEqual({ npcEntityId: 42, acceptQuest: false });
  });

  it("defaults to acceptance when no explicit decline was sent", () => {
    const writer = new ArrayBufferWriter();
    DialogueNpcCompleteEvent.serializeToBuffer(writer, { npcEntityId: 7 });

    const data = DialogueNpcCompleteEvent.deserializeFromBuffer(
      new BufferReader(writer.getBuffer()),
    );

    expect(data).toEqual({ npcEntityId: 7, acceptQuest: true });
  });
});
