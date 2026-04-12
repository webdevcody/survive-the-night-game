import { describe, expect, it } from "vitest";
import { ClientSentEvents } from "../events";
import { deserializeClientEvent, serializeClientEvent } from "./client-event-serialization";
import { Direction } from "../../util/direction";

describe("client event serialization", () => {
  it("registers reloadWeapon as a no-payload client event", () => {
    const buffer = serializeClientEvent(ClientSentEvents.RELOAD_WEAPON, []);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.RELOAD_WEAPON, buffer!);
    expect(decoded).toEqual([{}]);
  });

  it("round-trips sneak input state", () => {
    const buffer = serializeClientEvent(ClientSentEvents.PLAYER_INPUT, [
      {
        facing: Direction.Left,
        dx: -1,
        dy: 0,
        fire: true,
        sprint: false,
        sneak: true,
        aimAngle: undefined,
        aimDistance: undefined,
      },
    ]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.PLAYER_INPUT, buffer!);
    expect(decoded).toEqual([
      {
        facing: Direction.Left,
        dx: -1,
        dy: 0,
        fire: true,
        sprint: false,
        sneak: true,
        aimAngle: undefined,
        aimDistance: undefined,
      },
    ]);
  });

  it("round-trips combat roll request payloads", () => {
    const buffer = serializeClientEvent(ClientSentEvents.REQUEST_COMBAT_ROLL, [
      { angle: Math.PI * 1.25 },
    ]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.REQUEST_COMBAT_ROLL, buffer!);
    expect((decoded[0] as { angle: number }).angle).toBeCloseTo(Math.PI * 1.25, 4);
  });
});
