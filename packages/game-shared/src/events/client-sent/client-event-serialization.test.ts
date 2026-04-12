import { describe, expect, it } from "vitest";
import { ClientSentEvents } from "../events";
import { deserializeClientEvent, serializeClientEvent } from "./client-event-serialization";

describe("client event serialization", () => {
  it("registers reloadWeapon as a no-payload client event", () => {
    const buffer = serializeClientEvent(ClientSentEvents.RELOAD_WEAPON, []);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.RELOAD_WEAPON, buffer!);
    expect(decoded).toEqual([{}]);
  });
});
