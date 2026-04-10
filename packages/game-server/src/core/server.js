import { EntityManager } from "@/managers/entity-manager";
import { GameManagers } from "@/managers/game-managers";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { PerformanceTracker } from "@/util/performance";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { GameLoop } from "./game-loop";
export class GameServer {
    constructor(port = 3001) {
        this.performanceTracker = new PerformanceTracker();
        this.tickPerformanceTracker = new TickPerformanceTracker();
        this.socketManager = new ServerSocketManager(port, this);
        this.entityManager = new EntityManager();
        this.mapManager = new MapManager();
        this.gameManagers = new GameManagers(this.entityManager, this.mapManager, this.socketManager, this);
        this.entityManager.setGameManagers(this.gameManagers);
        this.entityManager.setTickPerformanceTracker(this.tickPerformanceTracker);
        this.mapManager.setGameManagers(this.gameManagers);
        this.socketManager.setEntityManager(this.entityManager);
        this.socketManager.setMapManager(this.mapManager);
        this.socketManager.setGameManagers(this.gameManagers);
        this.socketManager.setTickPerformanceTracker(this.tickPerformanceTracker);
        this.gameLoop = new GameLoop(this.tickPerformanceTracker, this.entityManager, this.mapManager, this.socketManager);
        this.gameLoop.setGameManagers(this.gameManagers);
        this.gameLoop.start();
    }
    /**
     * Generate/load the map and start the simulation, then accept WebSocket clients.
     * Call once after construction (see {@code server.ts}).
     */
    async bootstrap() {
        await this.startNewGame();
        this.socketManager.listen();
    }
    startNewGame() {
        return this.gameLoop.startNewGame();
    }
    stop() {
        this.gameLoop.stop();
    }
    /** Persist open-world last tiles (and binds) for every connected player to the website DB. */
    persistConnectedPlayersLastPositions() {
        return this.socketManager.persistConnectedPlayersLastPositions();
    }
    broadcastEvent(event) {
        this.socketManager.broadcastEvent(event);
    }
    sendGameMessageToPlayerEntity(playerEntityId, message, color) {
        this.socketManager.sendGameMessageToPlayerEntity(playerEntityId, message, color);
    }
    getPhaseStartTime() {
        return this.gameLoop.getPhaseStartTime();
    }
    getPhaseDuration() {
        return this.gameLoop.getPhaseDuration();
    }
    getTotalZombies() {
        return this.gameLoop.getTotalZombies();
    }
    setIsGameReady(isReady) {
        this.gameLoop.setIsGameReady(isReady);
    }
    getGameLoop() {
        return this.gameLoop;
    }
}
