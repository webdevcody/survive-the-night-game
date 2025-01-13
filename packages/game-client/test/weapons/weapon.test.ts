import { describe, it, expect, beforeEach, Mock } from "vitest";
import { PlayerClient } from "../../src/entities/player";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { GameState } from "@/state";
import { createMockCtx } from "../mocks/ctx";
import { createMockImageLoader } from "../mocks/image-loader";
import { EntityManager } from "@survive-the-night/game-server/src/managers/entity-manager";
import { createMockBroadcaster } from "../mocks/broadcaster";
import { Player } from "@survive-the-night/game-server";
import { Pistol } from "@survive-the-night/game-server/src/shared/entities/weapons/pistol";
import { PistolClient } from "@/entities/weapons/pistol";

describe("Weapon", () => {
  let player: PlayerClient;
  let pistol: PistolClient;

  beforeEach(() => {
    const broadcaster = createMockBroadcaster();
    const entityManager = new EntityManager(broadcaster);
    const pistolEntity = new Pistol(entityManager);
    const pistolRaw: RawEntity = pistolEntity.serialize();
    pistol = new PistolClient(pistolRaw, createMockImageLoader());
    const playerEntity = new Player(new EntityManager(broadcaster), broadcaster);
    const playerRaw: RawEntity = playerEntity.serialize();
    player = new PlayerClient(playerRaw, createMockImageLoader());
  });

  it("should render text when a player is within range of a weapon", () => {
    const mockCtx = createMockCtx();

    pistol.render(mockCtx, {
      entities: [player],
      playerId: player.getId(),
    } as unknown as GameState);

    expect(mockCtx.fillText).toHaveBeenCalled();
    expect((mockCtx.fillText as Mock).mock.calls[0][0]).toBe("pistol (e)");
  });
});
