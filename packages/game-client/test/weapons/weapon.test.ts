import { describe, it, expect, beforeEach, Mock } from "vitest";
import { WeaponClient } from "../../src/entities/weapons/weapon";
import { PlayerClient } from "../../src/entities/player";
import { RawEntity } from "@survive-the-night/game-shared";
import { GameState } from "@/state";
import { createMockCtx } from "../mocks/ctx";
import { createMockImageLoader } from "../mocks/image-loader";
import { Player, Weapon } from "@survive-the-night/game-server";
import { EntityManager } from "@survive-the-night/game-server/src/managers/entity-manager";
import { createMockBroadcaster } from "../mocks/broadcaster";

describe("Weapon", () => {
  let weapon: WeaponClient;
  let player: PlayerClient;

  beforeEach(() => {
    const broadcaster = createMockBroadcaster();
    const entityManager = new EntityManager(broadcaster);
    const pistol = new Weapon(entityManager, "pistol");
    const pistolRaw: RawEntity = pistol.serialize();
    weapon = new WeaponClient(pistolRaw, createMockImageLoader());
    const playerEntity = new Player(new EntityManager(broadcaster), broadcaster);
    const playerRaw: RawEntity = playerEntity.serialize();
    player = new PlayerClient(playerRaw, createMockImageLoader());
  });

  it("should render text when a player is within range of a weapon", () => {
    const mockCtx = createMockCtx();

    weapon.render(mockCtx, {
      entities: [player],
      playerId: player.getId(),
    } as unknown as GameState);

    expect(mockCtx.fillText).toHaveBeenCalled();
    expect((mockCtx.fillText as Mock).mock.calls[0][0]).toBe("pistol (e)");
  });
});
