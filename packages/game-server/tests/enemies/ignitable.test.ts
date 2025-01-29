import { GameManagers } from "@/managers/game-managers";
import { beforeEach, describe, expect, test } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";
import { Zombie } from "@/entities/enemies/zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import Ignitable from "@/extensions/ignitable";
import Destructible from "@/extensions/destructible";

describe("zombie fire interactions", () => {
  let gameManagers: GameManagers;

  beforeEach(() => {
    gameManagers = simpleTestSetup();
  });

  const zombieTypes = [
    { name: "Regular Zombie", constructor: Zombie },
    { name: "Big Zombie", constructor: BigZombie },
    { name: "Bat Zombie", constructor: BatZombie },
    { name: "Fast Zombie", constructor: FastZombie },
    { name: "Spitter Zombie", constructor: SpitterZombie },
  ];

  test.each(zombieTypes)("$name should be able to catch on fire", ({ constructor }) => {
    // Create zombie
    const zombie = new constructor(gameManagers);
    gameManagers.getEntityManager().addEntity(zombie);

    // Add ignitable extension to zombie
    const ignitable = new Ignitable(zombie);
    zombie.addExtension(ignitable);

    // Verify zombie has Ignitable extension
    expect(zombie.hasExt(Ignitable)).toBe(true);

    // Set zombie on fire and update to trigger damage
    gameManagers.getEntityManager().update(1);

    // Verify zombie took damage
    const health = zombie.getExt(Destructible).getHealth();
    expect(health).toBeLessThan(zombie.getExt(Destructible).getMaxHealth());
  });

  test.each(zombieTypes)("$name should stop burning after max damage", ({ constructor }) => {
    // Create zombie
    const zombie = new constructor(gameManagers);
    gameManagers.getEntityManager().addEntity(zombie);

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
});
