import { Zombie } from "@/entities/enemies/zombie";
import Destructible from "@/extensions/destructible";
import Ignitable from "@/extensions/ignitable";
import { GameManagers } from "@/managers/game-managers";
import { beforeEach, it, expect } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";

let zombie: Zombie;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();
  zombie = new Zombie(gameManagers);
  gameManagers.getEntityManager().addEntity(zombie);
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
