import { Player } from "@/entities/player";
import Destructible from "@/extensions/destructible";
import { GameManagers } from "@/managers/game-managers";
import { TILE_SIZE } from "@/managers/map-manager";
import { beforeEach, it, expect } from "vitest";
import { simpleTestSetup } from "../utils/setup";

let player: Player;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);

  gameManagers.getEntityManager().setMapSize(4 * TILE_SIZE, 4 * TILE_SIZE);

  player.setPosition({
    x: 0,
    y: 0,
  });
  gameManagers.getEntityManager().addEntity(player);

  // Add a bandage to player's inventory
  player.getInventory().push({ key: "bandage" });
});

it("a bandage should heal a player when consumed and removed from inventory", () => {
  // should have a bandage in inventory
  expect(player.getInventory()).toEqual([{ key: "bandage" }]);

  // // Damage the player first
  const destructible = player.getExt(Destructible);
  destructible.setHealth(1);
  expect(destructible.getHealth()).toBe(1);

  // // Set the active inventory slot to 1 (where the bandage is)
  player.selectInventoryItem(1);
  player.setUseItem(true);

  // // Update the player which will trigger consume
  gameManagers.getEntityManager().update(1);

  // // Verify the player was healed
  expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);
  // Verify the bandage was removed from inventory
  expect(player.getInventory()).toEqual([]);
});

it("a bandage should not be consumed if player is at full health", () => {
  expect(player.getInventory()).toEqual([{ key: "bandage" }]);

  const destructible = player.getExt(Destructible);
  expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);

  // Set the active inventory slot to 1 (where the bandage is)
  player.selectInventoryItem(1);
  player.setUseItem(true);

  // trigger update
  gameManagers.getEntityManager().update(1);

  // Verify the player's health didn't change
  expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);

  // Verify the bandage was not removed from inventory
  expect(player.getInventory()).toEqual([{ key: "bandage" }]);
});
