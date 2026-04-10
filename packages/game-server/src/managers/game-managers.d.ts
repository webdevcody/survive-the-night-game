import { IGameManagers, IEntityManager, IMapManager, Broadcaster, IGameServer } from "@/managers/types";
export declare class GameManagers implements IGameManagers {
    private entityManager;
    private mapManager;
    private broadcaster;
    private gameServer;
    constructor(entityManager: IEntityManager, mapManager: IMapManager, broadcaster: Broadcaster, gameServer: IGameServer);
    getEntityManager(): IEntityManager;
    getMapManager(): IMapManager;
    getBroadcaster(): Broadcaster;
    getGameServer(): IGameServer;
}
