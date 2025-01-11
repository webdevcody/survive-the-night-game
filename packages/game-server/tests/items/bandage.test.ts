import { expect, test, describe, beforeEach } from "vitest";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { MapManager } from "../../src/managers/map-manager";
import { EntityManager } from "../../src/managers/entity-manager";
import { Player } from "../../src/shared/entities/player";
import { Destructible, Updatable } from "../../src/shared/extensions";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import { TILE_SIZE } from "../../src/config/constants";

describe("Bandage", () => {
  let socketManager: ServerSocketManager;
  let entityManager: EntityManager;
  let mapManager: MapManager;
  let player: Player;

  beforeEach(() => {
    socketManager = new MockSocketManager() as unknown as ServerSocketManager;
    entityManager = new EntityManager(socketManager);
    mapManager = new MapManager(entityManager);
    mapManager.setSocketManager(socketManager);

    // Set a minimal map size for testing (4x4 tiles)
    entityManager.setMapSize(4 * TILE_SIZE, 4 * TILE_SIZE);

    player = new Player(entityManager, socketManager);
    player.setPosition({
      x: 0,
      y: 0,
    });
    entityManager.addEntity(player);

    // Add a bandage to player's inventory
    player.getInventory().push({ key: "bandage" });
  });

  test("a bandage should heal a player when consumed and removed from inventory", () => {
    // should have a bandage in inventory
    expect(player.getInventory()).toEqual([{ key: "bandage" }]);

    // Damage the player first
    const destructible = player.getExt(Destructible);
    destructible.setHealth(1);
    expect(destructible.getHealth()).toBe(1);

    // Set the active inventory slot to 1 (where the bandage is)
    player.selectInventoryItem(1);
    player.setUseItem(true);

    // Update the player which will trigger consume
    const updatable = player.getExt(Updatable);
    updatable.update(1);

    // Verify the player was healed
    expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);
    // Verify the bandage was removed from inventory
    expect(player.getInventory()).toEqual([]);
  });

  test("a bandage should not be consumed if player is at full health", () => {
    expect(player.getInventory()).toEqual([{ key: "bandage" }]);

    const destructible = player.getExt(Destructible);
    expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);

    // Set the active inventory slot to 1 (where the bandage is)
    player.selectInventoryItem(1);
    player.setUseItem(true);

    // trigger update
    const updatable = player.getExt(Updatable);
    updatable.update(1);

    // Verify the player's health didn't change
    expect(destructible.getHealth()).toBe(Player.MAX_HEALTH);

    // Verify the bandage was not removed from inventory
    expect(player.getInventory()).toEqual([{ key: "bandage" }]);
  });
});
