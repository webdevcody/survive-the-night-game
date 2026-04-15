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

  it("registers pointerActivity as a no-payload client event", () => {
    const buffer = serializeClientEvent(ClientSentEvents.POINTER_ACTIVITY, []);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.POINTER_ACTIVITY, buffer!);
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

  it("round-trips auction action payloads", () => {
    const payload = {
      auctionHouseEntityId: 42,
      kind: "buy" as const,
      bagSlotIndex: 3,
      price: 99,
      listingId: "abc-def",
      listQuantity: 0,
    };
    const buffer = serializeClientEvent(ClientSentEvents.AUCTION_ACTION, [payload]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.AUCTION_ACTION, buffer!);
    expect(decoded?.[0]).toEqual(payload);
  });

  it("round-trips consume item payloads with explicit slot index", () => {
    const payload = {
      itemType: null,
      slotIndex: 17,
    };
    const buffer = serializeClientEvent(ClientSentEvents.CONSUME_ITEM, [payload]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.CONSUME_ITEM, buffer!);
    expect(decoded?.[0]).toEqual(payload);
  });

  it("round-trips combat roll request payloads", () => {
    const buffer = serializeClientEvent(ClientSentEvents.REQUEST_COMBAT_ROLL, [
      { angle: Math.PI * 1.25 },
    ]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.REQUEST_COMBAT_ROLL, buffer!);
    expect((decoded[0] as { angle: number }).angle).toBeCloseTo(Math.PI * 1.25, 4);
  });

  it("round-trips split inventory stack payloads", () => {
    const payload = {
      slotIndex: 57,
      quantity: 1234,
    };
    const buffer = serializeClientEvent(ClientSentEvents.SPLIT_INVENTORY_STACK, [payload]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.SPLIT_INVENTORY_STACK, buffer!);
    expect(decoded?.[0]).toEqual(payload);
  });

  it("round-trips sign text payloads", () => {
    const payload = {
      slotIndex: 57,
      message: "Camp here tonight.\nLeave the barricade closed.",
    };
    const buffer = serializeClientEvent(ClientSentEvents.SET_SIGN_TEXT, [payload]);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const decoded = deserializeClientEvent(ClientSentEvents.SET_SIGN_TEXT, buffer!);
    expect(decoded?.[0]).toEqual(payload);
  });
});
