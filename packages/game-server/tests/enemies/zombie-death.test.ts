import { Zombie } from "../../src/shared/entities/zombie";
import { expect, test, vi } from "vitest";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { MapManager } from "../../src/managers/map-manager";
import { EntityManager } from "../../src/managers/entity-manager";
import { Bullet } from "../../src/shared/entities/bullet";
import { Destructible } from "../../src/index";

function setupBulletOverZombieScenario() {
  const socketManager = new MockSocketManager();
  vi.spyOn(socketManager, "broadcastEvent");
  const entityManager = new EntityManager(socketManager);
  const mapManager = new MapManager(entityManager);
  mapManager.setSocketManager(socketManager);

  mapManager.generateMap();

  const zombie = new Zombie(entityManager, mapManager, socketManager);
  zombie.setPosition({
    x: 0,
    y: 0,
  });
  entityManager.addEntity(zombie);

  const bullet = new Bullet(entityManager);
  bullet.setPosition({
    x: 0,
    y: 0,
  });
  entityManager.addEntity(bullet);

  return {
    entityManager,
    bullet,
    zombie,
    socketManager,
  };
}

test("a bullet should hurts a zombie during collisions, and removes itself", () => {
  const { entityManager, bullet, zombie } = setupBulletOverZombieScenario();

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
  const { entityManager, bullet, zombie, socketManager } = setupBulletOverZombieScenario();
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
