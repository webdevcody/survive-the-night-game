import { Zombie } from "../../src/shared/entities/zombie";
import { expect, test } from "vitest";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { MapManager } from "../../src/managers/map-manager";
import { EntityManager } from "../../src/managers/entity-manager";
import { Bullet } from "../../src/shared/entities/bullet";
import { Destructible, Updatable } from "../../src/index";

test("a bullet should hurts a zombie during collisions, and removes itself", () => {
  const socketManager = new MockSocketManager();
  const entityManager = new EntityManager(socketManager);
  const mapManager = new MapManager(entityManager);

  const zombie = new Zombie(entityManager, mapManager, socketManager);
  zombie.setPosition({
    x: 0,
    y: 0,
  });

  const bullet = new Bullet(entityManager);
  bullet.setPosition({
    x: 0,
    y: 0,
  });

  bullet.getExt(Updatable).update(0);

  const destructible = zombie.getExt(Destructible);
  expect(destructible.getHealth()).toBe(Zombie.MAX_HEALTH - 1);
  expect(entityManager.getEntitiesToRemove()).toBe([bullet.getId()]);
});
