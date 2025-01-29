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
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";

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

it("should not ignite bat zombie when flying over fire", () => {
  // Create bat zombie and position it over the fire
  const batZombie = new BatZombie(gameManagers);
  batZombie.setPosition(new Vector2(10, 0)); // Same position as the fire
  gameManagers.getEntityManager().addEntity(batZombie);

  // Update to check for fire interaction
  gameManagers.getEntityManager().update(1);

  // Verify bat zombie didn't catch fire
  expect(batZombie.hasExt(Ignitable)).toBe(false);

  // Verify bat zombie didn't take any damage
  const health = batZombie.getExt(Destructible).getHealth();
  expect(health).toBe(batZombie.getExt(Destructible).getMaxHealth());
});

it("should ignite all ground zombies when walking over fire", () => {
  // Remove existing zombie from beforeEach
  gameManagers.getEntityManager().markEntityForRemoval(zombie);

  // Create all ground zombie types
  const regularZombie = new Zombie(gameManagers);
  const bigZombie = new BigZombie(gameManagers);
  const fastZombie = new FastZombie(gameManagers);
  const spitterZombie = new SpitterZombie(gameManagers);

  const groundZombies = [regularZombie, bigZombie, fastZombie, spitterZombie];

  // Position all zombies over the fire
  groundZombies.forEach((zombie) => {
    zombie.setPosition(new Vector2(10, 0));
    gameManagers.getEntityManager().addEntity(zombie);
  });

  // Update to trigger fire damage cycle
  gameManagers.getEntityManager().update(1);

  // Verify all ground zombies caught fire and took damage
  groundZombies.forEach((zombie) => {
    expect(zombie.hasExt(Ignitable)).toBe(true);
    const health = zombie.getExt(Destructible).getHealth();
    expect(health).toBeLessThan(zombie.getExt(Destructible).getMaxHealth());
  });
});
