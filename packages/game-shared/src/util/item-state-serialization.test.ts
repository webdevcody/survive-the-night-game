import { describe, expect, it } from "vitest";
import { ArrayBufferWriter, BufferReader } from "./buffer-serialization";
import { readItemState, writeItemState } from "./item-state-serialization";

describe("item-state serialization", () => {
  it("round-trips loaded ammo alongside count and health", () => {
    const writer = new ArrayBufferWriter();
    writeItemState(writer, {
      count: 12,
      health: 7,
      loadedAmmo: 30,
    });

    const state = readItemState(new BufferReader(writer.getBuffer()));
    expect(state).toEqual({
      count: 12,
      health: 7,
      loadedAmmo: 30,
    });
  });

  it("omits absent fields without inventing defaults", () => {
    const writer = new ArrayBufferWriter();
    writeItemState(writer, {
      loadedAmmo: 5,
    });

    const state = readItemState(new BufferReader(writer.getBuffer()));
    expect(state).toEqual({
      loadedAmmo: 5,
    });
  });

  it("round-trips a sign message", () => {
    const writer = new ArrayBufferWriter();
    writeItemState(writer, {
      message: "Beware the horde.\nKeep the gate shut.",
    });

    const state = readItemState(new BufferReader(writer.getBuffer()));
    expect(state).toEqual({
      message: "Beware the horde.\nKeep the gate shut.",
    });
  });
});
