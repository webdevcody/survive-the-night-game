import { Zombie } from "../../src/shared/entities/zombie";
import { describe, expect, test, beforeEach, vi } from "vitest";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { MapManager } from "../../src/managers/map-manager";
import { EntityManager } from "../../src/managers/entity-manager";
import { Bullet } from "../../src/shared/entities/bullet";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import { TILE_SIZE } from "../../src/config/constants";
import Destructible from "@/shared/extensions/destructible";

describe("Zombie Death", () => {
  let socketManager: ServerSocketManager;
  let entityManager: EntityManager;
  let mapManager: MapManager;
  let zombie: Zombie;
  let bullet: Bullet;

  beforeEach(() => {
    socketManager = new MockSocketManager() as unknown as ServerSocketManager;
    vi.spyOn(socketManager, "broadcastEvent");
    entityManager = new EntityManager(socketManager);
    mapManager = new MapManager(entityManager);
    mapManager.setSocketManager(socketManager);

    // Set a minimal map size for testing (4x4 tiles)
    entityManager.setMapSize(4 * TILE_SIZE, 4 * TILE_SIZE);

    zombie = new Zombie(entityManager, mapManager, socketManager);
    zombie.setPosition({
      x: 0,
      y: 0,
    });
    entityManager.addEntity(zombie);

    bullet = new Bullet(entityManager);
    bullet.setPosition({
      x: 0,
      y: 0,
    });
    entityManager.addEntity(bullet);
  });

  test("a bullet should hurt a zombie during collisions, and removes itself", () => {
    entityManager.update(0);

    const destructible = zombie.getExt(Destructible);
    expect(destructible.getHealth()).toBe(Zombie.MAX_HEALTH - 1);
    expect(entityManager.getEntitiesToRemove()).toEqual([
      expect.objectContaining({
        id: bullet.getId(),
      }),
    ]);
  });

  test("a bullet should kill a zombie if the zombie only has 1 hp left", () => {
    zombie.getExt(Destructible).setHealth(1);

    entityManager.update(0);

    const destructible = zombie.getExt(Destructible);
    expect(destructible.isDead()).toBe(true);
    expect(entityManager.getEntitiesToRemove()).toEqual([
      expect.objectContaining({
        id: bullet.getId(),
      }),
    ]);
    expect(socketManager.broadcastEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "zombieHurt",
        zombieId: zombie.getId(),
      })
    );
  });
});
