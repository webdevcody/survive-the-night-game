import { it, expect, beforeEach } from "vitest";
import { Player } from "@/entities/player";
import { GameManagers } from "@/managers/game-managers";
import { simpleTestSetup } from "@/tests/utils/setup";
import { Entities } from "@shared/constants";

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

it("the ammo should be removed from the player's inventory after firing the last bullet", () => {
  player.getInventory().push({ key: "pistol" });
  player.getInventory().push({ key: "pistol_ammo", state: { count: 2 } });
  player.selectInventoryItem(1);

  player.setAsFiring(true);
  gameManagers.getEntityManager().update(1);
  expect(player.getInventory().some((item) => item.key === "pistol_ammo")).toBe(true);
  gameManagers.getEntityManager().update(1);
  expect(player.getInventory().some((item) => item.key === "pistol_ammo")).toBe(false);
});
