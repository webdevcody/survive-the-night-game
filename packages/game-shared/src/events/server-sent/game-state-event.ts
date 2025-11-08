import { GameEvent } from "../types";
import { ServerSentEvents } from "../events";
import { RawEntity } from "../../types/entity";
import { WaveState } from "../../types/wave";

export interface EntityState extends RawEntity {
  id: string;
}

export interface GameStateData {
  entities: EntityState[];
  removedEntityIds?: string[];
  isFullState?: boolean;
  // Legacy day/night cycle data (deprecated)
  dayNumber?: number;
  cycleStartTime?: number;
  cycleDuration?: number;
  isDay?: boolean;
  // Wave system data
  waveNumber?: number;
  waveState?: WaveState;
  phaseStartTime?: number;
  phaseDuration?: number;
  zombiesRemaining?: number;
  totalZombies?: number;
  timestamp?: number;
}

export class GameStateEvent implements GameEvent<GameStateData> {
  private readonly type = ServerSentEvents.GAME_STATE_UPDATE;
  private readonly data: GameStateData;

  constructor(data: GameStateData) {
    this.data = data;
  }

  public getType() {
    return this.type;
  }

  public serialize(): GameStateData {
    return this.data;
  }

  public getEntities(): EntityState[] {
    return this.data.entities;
  }

  public getRemovedEntityIds(): string[] {
    return this.data.removedEntityIds || [];
  }

  public isFullState(): boolean {
    return this.data.isFullState || false;
  }

  public getTimestamp(): number | undefined {
    return this.data.timestamp;
  }

  public getDayNumber(): number | undefined {
    return this.data.dayNumber;
  }

  public getCycleStartTime(): number | undefined {
    return this.data.cycleStartTime;
  }

  public getCycleDuration(): number | undefined {
    return this.data.cycleDuration;
  }

  public getIsDay(): boolean | undefined {
    return this.data.isDay;
  }

  public getWaveNumber(): number | undefined {
    return this.data.waveNumber;
  }

  public getWaveState(): WaveState | undefined {
    return this.data.waveState;
  }

  public getPhaseStartTime(): number | undefined {
    return this.data.phaseStartTime;
  }

  public getPhaseDuration(): number | undefined {
    return this.data.phaseDuration;
  }

  public getZombiesRemaining(): number | undefined {
    return this.data.zombiesRemaining;
  }

  public getTotalZombies(): number | undefined {
    return this.data.totalZombies;
  }
}
