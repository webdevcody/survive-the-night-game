import { it, expect, beforeEach } from "vitest";
import { Player } from "@/shared/entities/player";
import { Fire } from "@/shared/entities/environment/fire";
import Ignitable from "@/shared/extensions/ignitable";
import Positionable from "@/shared/extensions/positionable";
import { Zombie } from "@/shared/entities/zombie";
import { simpleTestSetup } from "@/tests/utils/setup";
import { GameManagers } from "@/managers/game-managers";
import Destructible from "@/shared/extensions/destructible";

let player: Player;
let fire: Fire;
let zombie: Zombie;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();

  player = new Player(gameManagers);
  fire = new Fire(gameManagers);
  zombie = new Zombie(gameManagers);

  player.setPosition({ x: 0, y: 0 });
  fire.getExt(Positionable).setPosition({ x: 10, y: 0 });
  zombie.setPosition({ x: 10, y: 0 });

  gameManagers.getEntityManager().addEntity(zombie);
  gameManagers.getEntityManager().addEntity(player);
  gameManagers.getEntityManager().addEntity(fire);
});

it("should damage zombie when ignited", () => {
  const initialHealth = zombie.getExt(Destructible).getHealth();

  // Add ignitable extension to zombie
  const ignitable = new Ignitable(zombie);
  zombie.addExtension(ignitable);

  // Update to trigger fire damage cycle
  gameManagers.getEntityManager().update(1);

  // Check if zombie took damage
  const currentHealth = zombie.getExt(Destructible).getHealth();
  expect(currentHealth).toBeLessThan(initialHealth);
});

it("should remove ignitable extension after max damage is dealt", () => {
  // Add ignitable extension to zombie
  const ignitable = new Ignitable(zombie);
  zombie.addExtension(ignitable);

  // First update - deals 1 damage
  gameManagers.getEntityManager().update(1);
  expect(zombie.hasExt(Ignitable)).toBe(true);

  // Second update - deals another 1 damage, reaching maxDamage (2)
  gameManagers.getEntityManager().update(1);
  expect(zombie.hasExt(Ignitable)).toBe(false);
});
