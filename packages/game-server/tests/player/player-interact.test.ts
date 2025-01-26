import { Player } from "@/entities/player";
import { Wall } from "@/entities/items/wall";
import Positionable from "@/extensions/positionable";
import { GameManagers } from "@/managers/game-managers";
import { beforeEach, vi, test, expect, describe } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";
import Vector2 from "@/util/vector2";

let player: Player;
let wall: Wall;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);
  player.getExt(Positionable).setPosition(new Vector2(100, 100));
  gameManagers.getEntityManager().addEntity(player);

  wall = new Wall(gameManagers);
  gameManagers.getEntityManager().addEntity(wall);
});

describe("player wall interactions", () => {
  test.each([
    ["north", new Vector2(100, 84)],
    ["south", new Vector2(100, 116)],
    ["east", new Vector2(116, 100)],
    ["west", new Vector2(84, 100)],
  ])("player should pick up wall from the %s", (direction, wallPosition) => {
    // Position wall next to player
    wall.getExt(Positionable).setPosition(wallPosition);

    // Simulate player interaction with wall
    player.setAsInteracting(true);
    gameManagers.getEntityManager().update(1);

    // Verify wall is in player's inventory
    expect(player.getInventory().some((item) => item.itemType === "wall")).toBe(true);
    expect(player.getInventory().length).toBe(1);

    // Verify wall is removed from entity manager
    expect(
      gameManagers
        .getEntityManager()
        .getEntitiesToRemove()
        .some((entity) => entity.id === wall.getId())
    ).toBe(true);

    // Simulate dropping the wall
    player.setAsInteracting(false);
    player.setAsDropping(true);
    gameManagers.getEntityManager().update(1);

    // Verify wall is back in entity manager
    expect(
      gameManagers
        .getEntityManager()
        .getEntities()
        .some((entity) => entity.getType() === wall.getType())
    ).toBe(true);

    // Verify wall is no longer in inventory
    expect(player.getInventory().some((item) => item.itemType === "wall")).toBe(false);
  });
});
