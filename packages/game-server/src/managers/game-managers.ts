import { IGameManagers, IEntityManager, IMapManager, Broadcaster, IGameServer } from "@/managers/types";

export class GameManagers implements IGameManagers {
  private entityManager: IEntityManager;
  private mapManager: IMapManager;
  private broadcaster: Broadcaster;
  private gameServer: IGameServer;

  constructor(entityManager: IEntityManager, mapManager: IMapManager, broadcaster: Broadcaster, gameServer: IGameServer) {
    this.entityManager = entityManager;
    this.mapManager = mapManager;
    this.broadcaster = broadcaster;
    this.gameServer = gameServer;
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

  getGameServer(): IGameServer {
    return this.gameServer;
  }
}
