import { describe, it, expect, beforeEach } from "vitest";
import { EntityManager } from "../../src/managers/entity-manager";
import { MapManager } from "../../src/managers/map-manager";
import { MockSocketManager } from "../mocks/mock-socket-manager";
import { Zombie } from "../../src/shared/entities/zombie";
import { ServerSocketManager } from "../../src/managers/server-socket-manager";
import Destructible from "../../src/shared/extensions/destructible";
import Ignitable from "../../src/shared/extensions/ignitable";

describe("Fire Effects", () => {
  let entityManager: EntityManager;
  let mapManager: MapManager;
  let socketManager: ServerSocketManager;
  let zombie: Zombie;

  beforeEach(() => {
    socketManager = new MockSocketManager() as unknown as ServerSocketManager;
    entityManager = new EntityManager(socketManager);
    mapManager = new MapManager(entityManager);
    mapManager.setSocketManager(socketManager);

    zombie = new Zombie(entityManager, mapManager, socketManager);
    entityManager.addEntity(zombie);
  });

  it("should damage zombie when ignited", () => {
    const initialHealth = zombie.getExt(Destructible).getHealth();

    // Add ignitable extension to zombie
    const ignitable = new Ignitable(zombie);
    zombie.addExtension(ignitable);

    // Update to trigger fire damage cycle
    entityManager.update(1);

    // Check if zombie took damage
    const currentHealth = zombie.getExt(Destructible).getHealth();
    expect(currentHealth).toBeLessThan(initialHealth);
  });

  it("should remove ignitable extension after max damage is dealt", () => {
    // Add ignitable extension to zombie
    const ignitable = new Ignitable(zombie);
    zombie.addExtension(ignitable);

    // First update - deals 1 damage
    entityManager.update(1);
    expect(zombie.hasExt(Ignitable)).toBe(true);

    // Second update - deals another 1 damage, reaching maxDamage (2)
    entityManager.update(1);
    expect(zombie.hasExt(Ignitable)).toBe(false);
  });
});
