import { it, expect, beforeEach, Mock } from "vitest";
import { PlayerClient } from "@/entities/player";
import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { createMockCtx } from "../mocks/ctx";
import { createMockImageLoader } from "../mocks/image-loader";
import { PistolClient } from "@/entities/weapons/pistol";
import { simpleTestSetup } from "@survive-the-night/game-server/tests/utils/setup";
import { GameManagers } from "@server/managers/game-managers";
import { Pistol } from "@server/entities/weapons/pistol";
import { Player } from "@server/entities/player";
import { BufferManager } from "@server/managers/buffer-manager";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { IEntity } from "@server/entities/types";

function serializeEntityToRaw(entity: IEntity): RawEntity {
  const bufferManager = new BufferManager();
  bufferManager.clear();
  bufferManager.writeEntityCount(1);
  bufferManager.writeEntity(entity, false);
  bufferManager.writeGameState({});
  bufferManager.writeRemovedEntityIds([]);
  const buffer = bufferManager.getBuffer();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const event = GameStateEvent.deserializeFromBuffer(arrayBuffer);
  const result = event.deserializeEntityFromBuffer(4);
  if (!result) {
    throw new Error("Failed to deserialize entity for test");
  }
  return result.entity;
}

let player: PlayerClient;
let pistol: PistolClient;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  const pistolEntity = new Pistol(gameManagers);
  const pistolRaw: RawEntity = serializeEntityToRaw(pistolEntity);
  pistol = new PistolClient(pistolRaw, createMockImageLoader());

  const playerEntity = new Player(gameManagers);
  const playerRaw: RawEntity = serializeEntityToRaw(playerEntity);
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
