import { describe, it, expect, beforeEach } from "vitest";
import { EntityManager } from "../../src/managers/entity-manager";
import { MapManager } from "../../src/managers/map-manager";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { Player } from "../../src/shared/entities/player";
import { Fire } from "../../src/shared/entities/environment/fire";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import Ignitable from "../../src/shared/extensions/ignitable";
import Positionable from "../../src/shared/extensions/positionable";
import { TILE_SIZE } from "../../src/config/constants";
import { Zombie } from "../../src/shared/entities/zombie";

describe("Fire Entity", () => {
  let entityManager: EntityManager;
  let mapManager: MapManager;
  let socketManager: ServerSocketManager;
  let player: Player;
  let fire: Fire;
  let zombie: Zombie;

  beforeEach(() => {
    socketManager = new MockSocketManager() as unknown as ServerSocketManager;
    entityManager = new EntityManager(socketManager);
    mapManager = new MapManager(entityManager);
    mapManager.setSocketManager(socketManager);
    mapManager.generateEmptyMap(4, 4);

    player = new Player(entityManager, socketManager);
    fire = new Fire(entityManager);
    zombie = new Zombie(entityManager, mapManager, socketManager);

    player.setPosition({ x: 0, y: 0 });
    fire.getExt(Positionable).setPosition({ x: 10, y: 0 });
    zombie.setPosition({ x: 10, y: 0 });

    entityManager.addEntity(zombie);
    entityManager.addEntity(player);
    entityManager.addEntity(fire);
  });

  it("should add ignitable extension to player when they enter fire trigger area", () => {
    expect(player.hasExt(Ignitable)).toBe(false);

    // Update to trigger fire's trigger check
    entityManager.update(1);

    expect(player.hasExt(Ignitable)).toBe(true);
  });

  it("should add ignitable extension to zombie when they enter fire trigger area", () => {
    expect(zombie.hasExt(Ignitable)).toBe(false);

    // Update to trigger fire's trigger check
    entityManager.update(1);

    expect(zombie.hasExt(Ignitable)).toBe(true);
  });
});
