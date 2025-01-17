import { Zombie } from "@/entities/enemies/zombie";
import { Fire } from "@/entities/environment/fire";
import { Player } from "@/entities/player";
import Destructible from "@/extensions/destructible";
import Ignitable from "@/extensions/ignitable";
import Positionable from "@/extensions/positionable";
import { GameManagers } from "@/managers/game-managers";
import { beforeEach, it, expect } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";
import Vector2 from "@/util/vector2";

let player: Player;
let fire: Fire;
let zombie: Zombie;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);
  fire = new Fire(gameManagers);
  zombie = new Zombie(gameManagers);

  player.setPosition(new Vector2(0, 0));
  fire.getExt(Positionable).setPosition(new Vector2(10, 0));
  zombie.setPosition(new Vector2(10, 0));


  gameManagers.getEntityManager().addEntity(fire);
  gameManagers.getEntityManager().addEntity(zombie);
  gameManagers.getEntityManager().addEntity(player);
});

it("should damage zombie when ignited", () => {
  const initialHealth = zombie.getExt(Destructible).getHealth();

  // Update to trigger fire damage cycle
  gameManagers.getEntityManager().update(1);

  // Check if zombie took damage
  const currentHealth = zombie.getExt(Destructible).getHealth();
  expect(currentHealth).toBeLessThan(initialHealth);
});

it("should remove ignitable extension after max damage is dealt", () => {
  // First update - deals 1 damage
  gameManagers.getEntityManager().update(1);
  expect(zombie.hasExt(Ignitable)).toBe(true);

  // Second update - deals another 1 damage, reaching maxDamage (2)
  gameManagers.getEntityManager().update(1);
  expect(zombie.hasExt(Ignitable)).toBe(false);
});
