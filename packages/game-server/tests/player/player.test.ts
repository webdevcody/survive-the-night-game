import { describe, it, expect, beforeEach } from "vitest";
import { EntityManager } from "../../src/managers/entity-manager";
import { MapManager } from "../../src/managers/map-manager";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import { Player } from "../../src/shared/entities/player";
import { Entities } from "@survive-the-night/game-shared";

describe("Player related tests", () => {
  let entityManager: EntityManager;
  let mapManager: MapManager;
  let socketManager: ServerSocketManager;
  let player: Player;

  beforeEach(() => {
    socketManager = new MockSocketManager() as unknown as ServerSocketManager;
    entityManager = new EntityManager(socketManager);
    mapManager = new MapManager(entityManager);
    mapManager.setSocketManager(socketManager);

    player = new Player(entityManager, socketManager);
    entityManager.addEntity(player);
  });

  it("a player should be able to fire a pistol if the pistol is selected in his inventory", () => {
    player.getInventory().push({ key: "pistol" });
    player.selectInventoryItem(1);

    player.setAsFiring(true);

    const gameHasSomeBullets = entityManager
      .getEntities()
      .some((entity) => entity.getType() === Entities.BULLET);

    expect(gameHasSomeBullets).toBe(false);

    entityManager.update(1);

    const gameHasSomeBulletsAfterUpdate = entityManager
      .getEntities()
      .some((entity) => entity.getType() === Entities.BULLET);

    expect(gameHasSomeBulletsAfterUpdate).toBe(true);
  });
});
