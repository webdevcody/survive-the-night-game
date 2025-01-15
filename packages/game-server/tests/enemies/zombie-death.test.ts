import { expect, test, beforeEach, vi } from "vitest";
import { Zombie } from "@/shared/entities/zombie";
import { Bullet } from "@/shared/entities/bullet";
import Destructible from "@/shared/extensions/destructible";
import { GameManagers } from "@/managers/game-managers";
import { simpleTestSetup } from "@/tests/utils/setup";

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
