import { describe, expect, it } from "vitest";
import { ServerSentEvents } from "../events";
import { deserializeServerEvent, serializeServerEvent } from "./server-event-serialization";

describe("server event serialization", () => {
  it("round-trips DUPLICATE_ACTIVE_SESSION message", () => {
    const payload = { message: "already playing elsewhere" };
    const buf = serializeServerEvent(ServerSentEvents.DUPLICATE_ACTIVE_SESSION, [payload]);
    expect(buf).not.toBeNull();

    const u8 = new Uint8Array(buf!);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
    const decoded = deserializeServerEvent(ServerSentEvents.DUPLICATE_ACTIVE_SESSION, ab);
    expect(decoded).not.toBeNull();
    expect(decoded![0]).toEqual(payload);
  });
});
