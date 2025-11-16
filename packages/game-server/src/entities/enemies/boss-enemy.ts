import { BaseEnemy } from "./base-enemy";
import { IGameManagers } from "@/managers/types";
import { EntityType } from "@shared/types/entity";
import { BossMetadata } from "@shared/entities";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { BossStepEvent } from "@shared/events/server-sent/boss-step-event";

export abstract class BossEnemy extends BaseEnemy {
  private static readonly MOVEMENT_EPSILON = 1;
  private footstepTimer = 0;
  private readonly bossMetadata: BossMetadata;

  constructor(gameManagers: IGameManagers, entityType: EntityType) {
    super(gameManagers, entityType);
    if (!this.config.boss) {
      throw new Error(`Boss metadata missing for ${entityType}`);
    }
    this.bossMetadata = this.config.boss;
  }

  protected override updateEnemy(deltaTime: number): void {
    super.updateEnemy(deltaTime);
    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      this.footstepTimer = 0;
      return;
    }

    this.updateBossEffects(deltaTime);
  }

  private updateBossEffects(deltaTime: number): void {
    const cameraShake = this.bossMetadata.cameraShake;
    if (!cameraShake) {
      return;
    }

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const isMoving =
      Math.abs(velocity.x) > BossEnemy.MOVEMENT_EPSILON ||
      Math.abs(velocity.y) > BossEnemy.MOVEMENT_EPSILON;

    if (!isMoving) {
      this.footstepTimer = 0;
      return;
    }

    const intervalSeconds = cameraShake.intervalMs / 1000;
    this.footstepTimer += deltaTime;

    if (this.footstepTimer < intervalSeconds) {
      return;
    }

    this.footstepTimer = 0;
    this.getGameManagers()
      .getBroadcaster()
      .broadcastEvent(
        new BossStepEvent({
          bossId: this.getId(),
          intensity: cameraShake.intensity,
          durationMs: cameraShake.durationMs,
        })
      );
  }

  protected getBossMetadata(): BossMetadata {
    return this.bossMetadata;
  }
}
