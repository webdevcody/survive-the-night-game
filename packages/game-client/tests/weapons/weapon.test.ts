import { it, expect, beforeEach, Mock } from "vitest";
import { PlayerClient } from "../../src/entities/player";
import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { createMockCtx } from "../mocks/ctx";
import { createMockImageLoader } from "../mocks/image-loader";
import { Pistol } from "@server/shared/entities/weapons/pistol";
import { PistolClient } from "@/entities/weapons/pistol";
import { simpleTestSetup } from "@survive-the-night/game-server/tests/utils/setup";
import { GameManagers } from "@server/managers/game-managers";
import { Player } from "@server/shared/entities/player";

let player: PlayerClient;
let pistol: PistolClient;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  const pistolEntity = new Pistol(gameManagers);
  const pistolRaw: RawEntity = pistolEntity.serialize();
  pistol = new PistolClient(pistolRaw, createMockImageLoader());

  const playerEntity = new Player(gameManagers);
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
