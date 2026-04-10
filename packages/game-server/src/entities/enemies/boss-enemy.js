import { BaseEnemy } from "./base-enemy";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { BossStepEvent } from "../../../../game-shared/src/events/server-sent/events/boss-step-event";
export class BossEnemy extends BaseEnemy {
    constructor(gameManagers, entityType) {
        super(gameManagers, entityType);
        this.footstepTimer = 0;
        if (!this.config.boss) {
            throw new Error(`Boss metadata missing for ${entityType}`);
        }
        this.bossMetadata = this.config.boss;
    }
    updateEnemy(deltaTime) {
        super.updateEnemy(deltaTime);
        const destructible = this.getExt(Destructible);
        if (destructible.isDead()) {
            this.footstepTimer = 0;
            return;
        }
        this.updateBossEffects(deltaTime);
    }
    updateBossEffects(deltaTime) {
        const cameraShake = this.bossMetadata.cameraShake;
        if (!cameraShake) {
            return;
        }
        const movable = this.getExt(Movable);
        const velocity = movable.getVelocity();
        const isMoving = Math.abs(velocity.x) > BossEnemy.MOVEMENT_EPSILON ||
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
            .broadcastEvent(new BossStepEvent({
            bossId: this.getId(),
            intensity: cameraShake.intensity,
            durationMs: cameraShake.durationMs,
        }));
    }
    getBossMetadata() {
        return this.bossMetadata;
    }
}
BossEnemy.MOVEMENT_EPSILON = 1;
