import { it, expect, beforeEach } from "vitest";
import { Player } from "@/entities/player";
import { GameManagers } from "@/managers/game-managers";
import { simpleTestSetup } from "@/tests/utils/setup";
import { Entities } from "@shared/constants";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";

let gameManagers: GameManagers;
let player: Player;
let zombie: FastZombie;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);
  player.clearInventory();
  gameManagers.getEntityManager().addEntity(player);

  zombie = new FastZombie(gameManagers);
  gameManagers.getEntityManager().addEntity(zombie);
});

it("a bullet should intersect with a fast zombie even though the bullet might travel through it (sweep collision detection test)", () => {
  player.getInventory().push({ itemType: "pistol" });
  player.getInventory().push({ itemType: "pistol_ammo", state: { count: 1 } });

  player.getExt(Positionable).setPosition(new Vector2(100, 100));
  zombie.getExt(Positionable).setPosition(new Vector2(116, 100));

  player.setAsFiring(true);
  gameManagers.getEntityManager().update(0.05);

  expect(zombie.getExt(Destructible).getHealth()).toBe(0);

  const gameHasSomeBulletsAfterUpdate = gameManagers
    .getEntityManager()
    .getEntities()
    .some((entity) => entity.getType() === Entities.BULLET);

  expect(gameHasSomeBulletsAfterUpdate).toBe(true);
});
