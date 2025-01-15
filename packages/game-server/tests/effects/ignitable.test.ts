import { it, expect, beforeEach } from "vitest";
import { Zombie } from "../../src/shared/entities/zombie";
import Destructible from "../../src/shared/extensions/destructible";
import Ignitable from "../../src/shared/extensions/ignitable";
import { GameManagers } from "../../src/managers/game-managers";
import { simpleTestSetup } from "../utils/setup";

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
