import { IEnvironmentalEventStrategy } from "../environmental-event-strategy";
import { EntityManager } from "../entity-manager";
import { MapManager } from "@/world/map-manager";
import { IGameManagers } from "../types";
import { environmentalEventsConfig } from "@shared/config/environmental-events-config";
import { GameMessageEvent } from "@shared/events/server-sent/events/game-message-event";
import { LightningBoltEvent } from "@shared/events/server-sent/events/lightning-bolt-event";
import { ServerSentEvents } from "@shared/events/events";
import { Player } from "@/entities/players/player";

/**
 * Strategy for managing thunderstorm environmental events
 */
export class ThunderstormEventStrategy implements IEnvironmentalEventStrategy {
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private gameManagers: IGameManagers;
  private active: boolean = false;
  private startTime: number = 0;
  private lastLightningTime: number = 0;
  private nextLightningTime: number = 0;

  constructor(gameManagers: IGameManagers, entityManager: EntityManager, mapManager: MapManager) {
    this.gameManagers = gameManagers;
    this.entityManager = entityManager;
    this.mapManager = mapManager;
  }

  public onWaveComplete(completedWaveNumber: number): void {
    // End current event if active
    if (this.active) {
      this.end();
    }

    // Check if we should trigger thunderstorm event
    if (this.shouldTriggerThunderstorm(completedWaveNumber)) {
      this.start();
    }
  }

  public onWaveStart(): void {
    // End thunderstorm event when wave starts
    if (this.active) {
      this.end();
    }
  }

  public update(deltaTime: number): void {
    if (!this.active) return;

    const config = environmentalEventsConfig.THUNDERSTORM;
    const currentTime = Date.now();

    // Check if event duration has elapsed
    if (currentTime - this.startTime >= config.DURATION * 1000) {
      this.end();
      return;
    }

    // Check if it's time for a lightning flash
    if (currentTime >= this.nextLightningTime) {
      this.triggerLightning();
      this.scheduleNextLightning();
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public end(): void {
    if (!this.active) return;

    this.active = false;

    // Broadcast thunderstorm end message
    this.gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "The thunderstorm has passed!",
        color: "blue",
        type: ServerSentEvents.THUNDERSTORM_END as any,
      })
    );
  }

  private shouldTriggerThunderstorm(completedWaveNumber: number): boolean {
    const config = environmentalEventsConfig.THUNDERSTORM;
    if (completedWaveNumber + 1 < config.MIN_WAVE) {
      return false;
    }
    return Math.random() < config.TRIGGER_CHANCE;
  }

  /**
   * Start thunderstorm event
   */
  private start(): void {
    this.active = true;
    this.startTime = Date.now();
    this.lastLightningTime = 0;
    this.scheduleNextLightning();

    // Broadcast thunderstorm start message
    this.gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "A thunderstorm is approaching!",
        color: "blue",
        type: ServerSentEvents.THUNDERSTORM_START as any,
      })
    );
  }

  /**
   * Trigger a lightning flash
   */
  private triggerLightning(): void {
    const currentTime = Date.now();
    this.lastLightningTime = currentTime;

    // Damage a random player
    const players = this.entityManager.getPlayerEntities();
    const alivePlayers = players.filter((player) => !player.isDead());

    let struckPlayerId: number | undefined = undefined;
    if (alivePlayers.length > 0) {
      const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const lightningDamage = 1; // Damage amount for lightning strike
      randomPlayer.damage(lightningDamage);
      struckPlayerId = randomPlayer.getId();
    }

    // Broadcast lightning bolt event with playerId
    this.gameManagers.getBroadcaster().broadcastEvent(
      new LightningBoltEvent({
        timestamp: currentTime,
        playerId: struckPlayerId,
      })
    );
  }

  /**
   * Schedule the next lightning flash
   */
  private scheduleNextLightning(): void {
    const config = environmentalEventsConfig.THUNDERSTORM;
    const interval =
      (config.LIGHTNING_INTERVAL.min +
        Math.random() * (config.LIGHTNING_INTERVAL.max - config.LIGHTNING_INTERVAL.min)) *
      1000;
    this.nextLightningTime = Date.now() + interval;
  }
}
