import { Zombie } from "../../src/shared/entities/zombie";
import { describe, expect, test, beforeEach, vi } from "vitest";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { MapManager } from "../../src/managers/map-manager";
import { EntityManager } from "../../src/managers/entity-manager";
import { Bullet } from "../../src/shared/entities/bullet";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import { TILE_SIZE } from "../../src/config/constants";
import Destructible from "../../src/shared/extensions/destructible";
import { GameManagers } from "../../src/managers/game-managers";
import { simpleTestSetup } from "../utils/setup";

let socketManager: ServerSocketManager;
let entityManager: EntityManager;
let mapManager: MapManager;
let zombie: Zombie;
let bullet: Bullet;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();
  vi.spyOn(gameManagers.getBroadcaster(), "broadcastEvent");

  zombie = new Zombie(gameManagers);
  zombie.setPosition({
    x: 0,
    y: 0,
  });
  gameManagers.getEntityManager().addEntity(zombie);

  bullet = new Bullet(gameManagers);
  bullet.setPosition({
    x: 0,
    y: 0,
  });
  gameManagers.getEntityManager().addEntity(bullet);
});

test("a bullet should hurt a zombie during collisions, and removes itself", () => {
  gameManagers.getEntityManager().update(0);

  const destructible = zombie.getExt(Destructible);
  expect(destructible.getHealth()).toBe(Zombie.MAX_HEALTH - 1);
  expect(gameManagers.getEntityManager().getEntitiesToRemove()).toEqual([
    expect.objectContaining({
      id: bullet.getId(),
    }),
  ]);
});

test("a bullet should kill a zombie if the zombie only has 1 hp left", () => {
  zombie.getExt(Destructible).setHealth(1);

  gameManagers.getEntityManager().update(0);

  const destructible = zombie.getExt(Destructible);
  expect(destructible.isDead()).toBe(true);
  expect(gameManagers.getEntityManager().getEntitiesToRemove()).toEqual([
    expect.objectContaining({
      id: bullet.getId(),
    }),
  ]);
  expect(gameManagers.getBroadcaster().broadcastEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "zombieHurt",
      zombieId: zombie.getId(),
    })
  );
});
