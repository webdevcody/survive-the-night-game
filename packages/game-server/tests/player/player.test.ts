import { it, expect, beforeEach } from "vitest";
import { Player } from "../../src/shared/entities/player";
import { Entities } from "@survive-the-night/game-shared/src/constants";
import { GameManagers } from "../../src/managers/game-managers";
import { simpleTestSetup } from "../utils/setup";

let gameManagers: GameManagers;
let player: Player;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);
  gameManagers.getEntityManager().addEntity(player);
});

it("a player should be able to fire a pistol if the pistol is selected in his inventory", () => {
  player.getInventory().push({ key: "pistol" });
  player.getInventory().push({ key: "pistol_ammo", state: { count: 1 } });
  player.selectInventoryItem(1);

  player.setAsFiring(true);

  const gameHasSomeBullets = gameManagers
    .getEntityManager()
    .getEntities()
    .some((entity) => entity.getType() === Entities.BULLET);

  expect(gameHasSomeBullets).toBe(false);

  gameManagers.getEntityManager().update(1);

  const gameHasSomeBulletsAfterUpdate = gameManagers
    .getEntityManager()
    .getEntities()
    .some((entity) => entity.getType() === Entities.BULLET);

  expect(gameHasSomeBulletsAfterUpdate).toBe(true);
});
