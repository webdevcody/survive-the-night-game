import { EntityManager } from "@/managers/entity-manager";
import { MapManager } from "@/managers/map-manager";
import { createMockSocketManager } from "@/tests/mocks/mock-socket-manager";
import { GameManagers } from "@/managers/game-managers";

export function simpleTestSetup() {
  const broadcaster = createMockSocketManager();
  const entityManager = new EntityManager();
  const mapManager = new MapManager();

  const gameManagers = new GameManagers(entityManager, mapManager, broadcaster);

  entityManager.setGameManagers(gameManagers);
  mapManager.setGameManagers(gameManagers);
  mapManager.generateEmptyMap(4, 4);

  return gameManagers;
}
