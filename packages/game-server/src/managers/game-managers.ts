import { IGameManagers, IEntityManager, IMapManager, Broadcaster } from "./types";

export class GameManagers implements IGameManagers {
  private entityManager: IEntityManager;
  private mapManager: IMapManager;
  private broadcaster: Broadcaster;

  constructor(entityManager: IEntityManager, mapManager: IMapManager, broadcaster: Broadcaster) {
    this.entityManager = entityManager;
    this.mapManager = mapManager;
    this.broadcaster = broadcaster;
  }

  getEntityManager(): IEntityManager {
    return this.entityManager;
  }

  getMapManager(): IMapManager {
    return this.mapManager;
  }

  getBroadcaster(): Broadcaster {
    return this.broadcaster;
  }
}
