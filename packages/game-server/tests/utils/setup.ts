import { EntityManager } from "../../src/managers/entity-manager";
import { MapManager } from "../../src/managers/map-manager";
import { createMockSocketManager } from "../mocks/mock-socket-manager";
import { GameManagers } from "../../src/managers/game-managers";

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
