import { it, expect, beforeEach } from "vitest";
import { Landmine } from "@/entities/items/landmine";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { simpleTestSetup } from "@/tests/utils/setup";
import { GameManagers } from "@/managers/game-managers";
import { Zombie } from "@/entities/enemies/zombie";
import Vector2 from "@/util/vector2";

let gameManagers: GameManagers;
let landmine: Landmine;

beforeEach(() => {
  gameManagers = simpleTestSetup();
});

it("should explode and kill all zombies within explosion radius", () => {
  landmine = new Landmine(gameManagers);
  gameManagers.getEntityManager().addEntity(landmine);
  landmine.getExt(Positionable).setPosition(new Vector2(32, 32));

  // Create 3 zombies within 32 pixel radius
  const zombie1 = new Zombie(gameManagers);
  zombie1.getExt(Positionable).setPosition(new Vector2(42, 42)); // ~14 pixels away
  gameManagers.getEntityManager().addEntity(zombie1);

  const zombie2 = new Zombie(gameManagers);
  zombie2.getExt(Positionable).setPosition(new Vector2(22, 22)); // ~14 pixels away
  gameManagers.getEntityManager().addEntity(zombie2);

  const zombie3 = new Zombie(gameManagers);
  zombie3.getExt(Positionable).setPosition(new Vector2(52, 32)); // 20 pixels away
  gameManagers.getEntityManager().addEntity(zombie3);

  // Update to trigger explosion
  gameManagers.getEntityManager().update(1);

  // Verify all zombies are dead
  expect(zombie1.getExt(Destructible).getHealth()).toBe(0);
  expect(zombie2.getExt(Destructible).getHealth()).toBe(0);
  expect(zombie3.getExt(Destructible).getHealth()).toBe(0);

  // Verify landmine was removed
  expect(gameManagers.getEntityManager().getEntitiesToRemove()).toEqual([
    expect.objectContaining({
      id: landmine.getId(),
    }),
  ]);
});
