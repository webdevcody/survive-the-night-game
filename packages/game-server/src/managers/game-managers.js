export class GameManagers {
    constructor(entityManager, mapManager, broadcaster, gameServer) {
        this.entityManager = entityManager;
        this.mapManager = mapManager;
        this.broadcaster = broadcaster;
        this.gameServer = gameServer;
    }
    getEntityManager() {
        return this.entityManager;
    }
    getMapManager() {
        return this.mapManager;
    }
    getBroadcaster() {
        return this.broadcaster;
    }
    getGameServer() {
        return this.gameServer;
    }
}
