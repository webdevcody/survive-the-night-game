/**
 * GameLoop - Core game loop and game state management
 *
 * This class handles the main game loop that runs every tick, managing:
 * - Entity updates (movement, AI, physics)
 * - Game state (phase timing for battle royale, game over detection)
 * - Game state broadcasting to clients
 * - Performance tracking
 *
 * The GameLoop is instantiated by GameServer and runs independently,
 * updating entities and managing game flow. It does NOT handle:
 * - Network connections (handled by ServerSocketManager)
 * - Entity creation/removal (handled by EntityManager)
 * - Map generation (handled by MapManager)
 *
 * The loop only runs when isGameReady is true and stops when isGameOver is true.
 * When the game ends, it automatically restarts after 5 seconds.
 */
import { GameOverEvent } from "../../../game-shared/src/events/server-sent/events/game-over-event";
import { GameStateEvent, } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { TICK_RATE, TICK_RATE_MS, } from "@/config/config";
import { createGameModeStrategy } from "@/game-modes";
export class GameLoop {
    constructor(tickPerformanceTracker, entityManager, mapManager, socketManager) {
        this.lastUpdateTime = performance.now();
        this.timer = null;
        /** Phase timer (e.g. battle royale toxic zone countdown) */
        this.phaseStartTime = Date.now();
        this.phaseDuration = 0;
        this.totalZombies = 0;
        this.isGameReady = false;
        this.isGameOver = false;
        /** True after a full open_world start; used to resume the same map when the server was empty. */
        this.openWorldSessionActive = false;
        this.gameModeStrategy = createGameModeStrategy();
        this.gameManagers = null;
        this.lastBroadcastedState = {
            phaseStartTime: -1,
            phaseDuration: -1,
            totalZombies: -1,
        };
        this.tickPerformanceTracker = tickPerformanceTracker;
        this.entityManager = entityManager;
        this.mapManager = mapManager;
        this.socketManager = socketManager;
    }
    /**
     * Set game managers (called after construction to avoid circular dependency)
     */
    setGameManagers(gameManagers) {
        this.gameManagers = gameManagers;
    }
    /**
     * Get the current game mode strategy
     */
    getGameModeStrategy() {
        return this.gameModeStrategy;
    }
    /**
     * Set the game mode strategy (used to switch game modes)
     */
    setGameModeStrategy(strategy) {
        this.gameModeStrategy = strategy;
    }
    getPhaseStartTime() {
        return this.phaseStartTime;
    }
    getPhaseDuration() {
        return this.phaseDuration;
    }
    getTotalZombies() {
        return this.totalZombies;
    }
    /**
     * Set the phase timer (used by game mode strategies for custom timers)
     */
    setPhaseTimer(startTime, duration) {
        this.phaseStartTime = startTime;
        this.phaseDuration = duration;
    }
    isOpenWorldSessionActive() {
        return this.openWorldSessionActive;
    }
    /**
     * First player reconnected after everyone left: keep entities and map, spawn players, re-sync clients.
     */
    async resumeOpenWorldSession() {
        this.isGameReady = true;
        this.isGameOver = false;
        await this.socketManager.recreatePlayersForConnectedSockets();
        if (this.gameManagers) {
            this.gameModeStrategy.onGameStart(this.gameManagers);
        }
        const gameMode = this.gameModeStrategy.getConfig().modeId;
        this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
        this.socketManager.sendInitializationToAllSockets();
    }
    start() {
        this.startGameLoop();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
    async startNewGame(strategy) {
        this.openWorldSessionActive = false;
        if (strategy) {
            this.gameModeStrategy = strategy;
        }
        this.isGameReady = true;
        this.isGameOver = false;
        this.phaseStartTime = Date.now();
        this.phaseDuration = 0;
        this.totalZombies = 0;
        // Clear all entities first
        this.entityManager.clear();
        // Generate new map
        this.mapManager.generateMap();
        await this.socketManager.recreatePlayersForConnectedSockets();
        if (this.gameManagers) {
            this.gameModeStrategy.onGameStart(this.gameManagers);
        }
        const gameMode = this.gameModeStrategy.getConfig().modeId;
        this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
        this.socketManager.sendInitializationToAllSockets();
        this.openWorldSessionActive = true;
    }
    setIsGameOver(isGameOver) {
        this.isGameOver = isGameOver;
    }
    setIsGameReady(isReady) {
        this.isGameReady = isReady;
    }
    getIsGameReady() {
        return this.isGameReady;
    }
    getIsGameOver() {
        return this.isGameOver;
    }
    startGameLoop() {
        this.timer = setInterval(() => {
            // console.profile();
            this.update();
            // console.profileEnd();
        }, 1000 / TICK_RATE);
    }
    update() {
        if (!this.isGameReady) {
            return;
        }
        if (this.isGameOver) {
            return;
        }
        // setup
        const updateStartTime = performance.now();
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
        // Track updateEntities
        const endUpdateEntities = this.tickPerformanceTracker.startMethod("updateEntities");
        this.updateEntities(deltaTime);
        endUpdateEntities();
        if (this.gameManagers) {
            this.gameModeStrategy.update(deltaTime, this.gameManagers);
        }
        // Track handleIfGameOver
        const endHandleIfGameOver = this.tickPerformanceTracker.startMethod("handleIfGameOver");
        this.handleIfGameOver();
        endHandleIfGameOver();
        // Track pruneEntities
        const endPruneEntities = this.tickPerformanceTracker.startMethod("pruneEntities");
        this.entityManager.pruneEntities();
        endPruneEntities();
        // Track broadcastGameState
        const endBroadcastGameState = this.tickPerformanceTracker.startMethod("broadcastGameState");
        this.broadcastGameState();
        endBroadcastGameState();
        // No longer need to track entities - dirty flags handle change detection
        // Dirty flags are cleared in broadcastEvent() after broadcasting
        // Record total tick time and track performance
        const totalTickTime = performance.now() - updateStartTime;
        this.tickPerformanceTracker.recordTick(totalTickTime);
        // Record bandwidth (bytes per second)
        const bandwidth = this.socketManager.getCurrentBandwidth();
        this.tickPerformanceTracker.recordBandwidth(bandwidth);
        this.trackPerformance(updateStartTime);
        this.lastUpdateTime = currentTime;
        // TODO: print all the performance stats for each method and total server tick time averages.
    }
    handleIfGameOver() {
        if (!this.gameManagers)
            return;
        const result = this.gameModeStrategy.checkWinCondition(this.gameManagers);
        if (result.gameEnded) {
            this.endGame(result);
        }
    }
    endGame(result) {
        var _a, _b, _c;
        this.isGameOver = true;
        // Notify strategy of game end
        if (this.gameManagers) {
            this.gameModeStrategy.onGameEnd(this.gameManagers);
        }
        // Broadcast game over event with winner info
        this.socketManager.broadcastEvent(new GameOverEvent({
            winnerId: (_a = result === null || result === void 0 ? void 0 : result.winnerId) !== null && _a !== void 0 ? _a : null,
            winnerName: (_b = result === null || result === void 0 ? void 0 : result.winnerName) !== null && _b !== void 0 ? _b : null,
            message: (_c = result === null || result === void 0 ? void 0 : result.message) !== null && _c !== void 0 ? _c : "Game Over",
        }));
        setTimeout(() => {
            void this.startNewGame(createGameModeStrategy()).catch((err) => {
                console.error("[GameLoop] startNewGame after game over failed:", err);
            });
        }, 5000);
    }
    trackPerformance(updateStartTime) {
        const updateDuration = performance.now() - updateStartTime;
        // Warn if update took longer than tick rate
        if (updateDuration > TICK_RATE_MS) {
            console.warn(`Warning: Slow update detected - took ${updateDuration.toFixed(2)}ms (>${TICK_RATE_MS.toFixed(2)}ms threshold)`);
        }
    }
    updateEntities(deltaTime) {
        this.entityManager.update(deltaTime);
    }
    getCurrentGameState() {
        const state = {
            timestamp: Date.now(),
            phaseStartTime: this.phaseStartTime,
            phaseDuration: this.phaseDuration,
            totalZombies: this.totalZombies,
        };
        return state;
    }
    broadcastGameState() {
        // Don't serialize entities here - let broadcastEvent() handle it with dirty flags
        // Only include state properties that have changed
        const currentState = this.getCurrentGameState();
        const stateUpdate = {
            entities: [], // Entities are handled separately via dirty flags
            timestamp: currentState.timestamp,
        };
        // Compare current state with last broadcasted state using Object.keys
        Object.keys(currentState).forEach((key) => {
            if (key === "timestamp")
                return;
            const currentValue = currentState[key];
            const lastValue = this.lastBroadcastedState[key];
            // For objects, do deep comparison
            let hasChanged = false;
            if (currentValue === null || currentValue === undefined) {
                hasChanged = lastValue !== currentValue;
            }
            else if (typeof currentValue === "object" && !Array.isArray(currentValue)) {
                // Deep comparison for objects
                if (lastValue === null || lastValue === undefined) {
                    hasChanged = true;
                }
                else {
                    // Compare object properties
                    const currentKeys = Object.keys(currentValue);
                    const lastKeys = Object.keys(lastValue || {});
                    if (currentKeys.length !== lastKeys.length) {
                        hasChanged = true;
                    }
                    else {
                        hasChanged = currentKeys.some((k) => currentValue[k] !== lastValue[k]);
                    }
                }
            }
            else {
                // Primitive comparison
                hasChanged = currentValue !== lastValue;
            }
            if (hasChanged) {
                stateUpdate[key] = currentValue;
                // Deep copy objects to avoid reference issues
                if (currentValue !== null &&
                    typeof currentValue === "object" &&
                    !Array.isArray(currentValue)) {
                    this.lastBroadcastedState[key] = Object.assign({}, currentValue);
                }
                else {
                    this.lastBroadcastedState[key] = currentValue;
                }
            }
        });
        const gameStateEvent = new GameStateEvent(stateUpdate);
        this.socketManager.broadcastEvent(gameStateEvent);
    }
}
