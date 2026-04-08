import { EntityManager } from "./entity-manager";
import { MapManager } from "@/world/map-manager";
import { IGameManagers } from "./types";
import { IEnvironmentalEventStrategy } from "./environmental-event-strategy";
import { ToxicGasEventStrategy } from "./strategies/toxic-gas-event-strategy";
import { ThunderstormEventStrategy } from "./strategies/thunderstorm-event-strategy";
import { environmentalEventsConfig } from "@shared/config/environmental-events-config";

/**
 * Manages random environmental events using strategy pattern
 */
export class EnvironmentalEventManager {
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private gameManagers: IGameManagers;
  private strategies: IEnvironmentalEventStrategy[] = [];
  private cycleAccumulator = 0;
  private completedCycles = 0;

  constructor(gameManagers: IGameManagers, entityManager: EntityManager, mapManager: MapManager) {
    this.gameManagers = gameManagers;
    this.entityManager = entityManager;
    this.mapManager = mapManager;

    this.strategies.push(new ToxicGasEventStrategy(gameManagers, entityManager, mapManager));
    this.strategies.push(new ThunderstormEventStrategy(gameManagers, entityManager, mapManager));
  }

  public update(deltaTime: number): void {
    this.cycleAccumulator += deltaTime;
    const interval = environmentalEventsConfig.CYCLE_INTERVAL_SECONDS;
    while (this.cycleAccumulator >= interval) {
      this.cycleAccumulator -= interval;
      for (const strategy of this.strategies) {
        strategy.onPeriodicRoll(this.completedCycles);
      }
      this.completedCycles++;
    }

    for (const strategy of this.strategies) {
      strategy.update(deltaTime);
    }
  }

  /**
   * Reset all environmental events (ends any active events)
   * Called when game restarts to ensure clean state
   */
  public reset(): void {
    this.cycleAccumulator = 0;
    this.completedCycles = 0;
    for (const strategy of this.strategies) {
      if (strategy.isActive()) {
        strategy.end();
      }
    }
  }

  /**
   * Get toxic gas event strategy (for backward compatibility)
   */
  public getToxicGasStrategy(): ToxicGasEventStrategy | null {
    return this.strategies.find(
      (s) => s instanceof ToxicGasEventStrategy
    ) as ToxicGasEventStrategy | null;
  }

  /**
   * Check if toxic gas event is active (for backward compatibility)
   */
  public isToxicGasEventActive(): boolean {
    const strategy = this.getToxicGasStrategy();
    return strategy ? strategy.isActive() : false;
  }

  /**
   * Get all active toxic gas clouds (for backward compatibility)
   */
  public getToxicGasClouds() {
    const strategy = this.getToxicGasStrategy();
    return strategy ? strategy.getToxicGasClouds() : [];
  }
}
