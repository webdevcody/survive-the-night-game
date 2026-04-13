import { describe, expect, it } from "vitest";
import { ArrayBufferWriter, BufferReader } from "./buffer-serialization";
import Vector2 from "./vector2";

describe("buffer serialization", () => {
  it("round-trips world positions near the current map edge", () => {
    const writer = new ArrayBufferWriter();
    writer.writePosition2(new Vector2(4095.75, 4080.25));

    const position = new BufferReader(writer.getBuffer()).readPosition2();

    expect(position.x).toBe(4095.75);
    expect(position.y).toBe(4080.25);
  });

  it("preserves signed off-map positions", () => {
    const writer = new ArrayBufferWriter();
    writer.writePosition2(new Vector2(-12.25, 24.75));

    const position = new BufferReader(writer.getBuffer()).readPosition2();

    expect(position.x).toBe(-12.25);
    expect(position.y).toBe(24.75);
  });
});
