import { Zombie } from "@/entities/enemies/zombie";
import { Wall } from "@/entities/items/wall";
import Destructible from "@/extensions/destructible";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import { GameManagers } from "@/managers/game-managers";
import { beforeEach, vi, test, expect, describe, it } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";
import Vector2 from "@/util/vector2";
import { WALL_MAX_HEALTH } from "@/constants/constants";

let zombie: Zombie;
let wall: Wall;
let gameManagers: GameManagers;

beforeEach(() => {
  gameManagers = simpleTestSetup();
  vi.spyOn(gameManagers.getBroadcaster(), "broadcastEvent");

  zombie = new Zombie(gameManagers);
  zombie.getExt(Positionable).setPosition(new Vector2(100, 100));
  gameManagers.getEntityManager().addEntity(zombie);

  wall = new Wall(gameManagers);
  gameManagers.getEntityManager().addEntity(wall);
});

describe("zombie wall interactions", () => {
  test.each([
    ["north", new Vector2(100, 84), new Vector2(0, -1)],
    ["south", new Vector2(100, 116), new Vector2(0, 1)],
    ["east", new Vector2(116, 100), new Vector2(1, 0)],
    ["west", new Vector2(84, 100), new Vector2(-1, 0)],
    // ["north-west", new Vector2(84, 84), new Vector2(-1, -1)],
    // ["north-east", new Vector2(116, 84), new Vector2(1, -1)],
    // ["south-west", new Vector2(84, 116), new Vector2(-1, 1)],
    // ["south-east", new Vector2(116, 116), new Vector2(1, 1)],
  ])("zombie should attack and destroy wall to the %s", (direction, wallPosition, velocity) => {
    // Position wall next to zombie
    wall.getExt(Positionable).setPosition(wallPosition);

    // Update entities to trigger zombie behavior
    gameManagers.getEntityManager().update(0);

    // Verify zombie is moving towards wall
    const movable = zombie.getExt(Movable);
    movable.setVelocity(velocity);

    // Simulate multiple updates to allow zombie to attack wall
    for (let i = 0; i < WALL_MAX_HEALTH; i++) {
      gameManagers.getEntityManager().update(1);
    }

    // Verify wall was damaged/destroyed
    const wallDestructible = wall.getExt(Destructible);
    expect(wallDestructible.isDead()).toBe(true);
  });

  it("zombie should not attack wall if it is not within attack range", () => {
    // Position wall next to zombie
    wall.getExt(Positionable).setPosition(new Vector2(116, 116));

    // Update entities to trigger zombie behavior
    gameManagers.getEntityManager().update(1);

    // Verify wall was not damaged/destroyed
    const wallDestructible = wall.getExt(Destructible);
    expect(wallDestructible.getHealth()).toBe(WALL_MAX_HEALTH);
  });
});
