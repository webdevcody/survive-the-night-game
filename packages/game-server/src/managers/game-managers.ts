import { Broadcaster, IEntityManager, IGameManagers, IMapManager } from "./types";

export class GameManagers implements IGameManagers {
  constructor(
    private entityManager: IEntityManager,
    private mapManager: IMapManager,
    private broadcaster: Broadcaster
  ) {
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
