import { describe, expect, it } from "vitest";

import { EntityStateTracker } from "@/managers/entity-state-tracker";
import type { IGameManagers, IEntityManager, IMapManager, IGameServer } from "@/managers/types";
import { Player } from "./player.ts";

function createStubEntityManager(): IEntityManager {
  const tracker = new EntityStateTracker();

  return {
    generateEntityId: () => 1,
    addEntity: () => {},
    markEntityForRemoval: () => {},
    removeEntity: () => {},
    createEntityFromItem: () => null,
    isColliding: () => null,
    getClosestAlivePlayer: () => null,
    getEntityById: () => null,
    getEntitiesByType: () => [],
    getNearbyEntities: () => [],
    getNearbyIntersectingDestructableEntities: () => [],
    getBroadcaster: () => ({ broadcastEvent: () => {} }),
    getIntersectingCollidableEntity: () => null,
    getPlayerEntities: () => [],
    getEntitiesToRemove: () => [],
    clear: () => {},
    update: () => {},
    getEntities: () => [],
    setMapSize: () => {},
    createEntity: () => null,
    getEntityStateTracker: () => tracker,
  };
}

function createStubGameManagers(): IGameManagers {
  const entityManager = createStubEntityManager();
  return {
    getEntityManager: () => entityManager,
    getBroadcaster: () => ({ broadcastEvent: () => {} }),
    getMapManager: () => ({}) as IMapManager,
    getGameServer: () => ({}) as IGameServer,
  };
}

describe("Player class selection", () => {
  it("defaults new players to the survivor class", () => {
    const player = new Player(createStubGameManagers());

    expect(player.getPlayerClassId()).toBe("survivor");
  });

  it("stores the selected class in serialized player state", () => {
    const player = new Player(createStubGameManagers());

    player.setPlayerClassId("medic");

    expect(player.getPlayerClassId()).toBe("medic");
    expect(player.getSerialized().get("playerClassId")).toBe("medic");
  });
});
