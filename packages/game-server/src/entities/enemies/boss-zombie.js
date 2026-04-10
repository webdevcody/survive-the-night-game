import { BossEnemy } from "./boss-enemy";
import { Entities } from "@/constants";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import { Cooldown } from "@/entities/util/cooldown";
import { ZombieFactory } from "@/util/zombie-factory";
import Positionable from "@/extensions/positionable";
import { BossSummonEvent } from "../../../../game-shared/src/events/server-sent/events/boss-summon-event";
import Destructible from "@/extensions/destructible";
import { getConfig } from "@shared/config";
export class BossZombie extends BossEnemy {
    constructor(gameManagers) {
        super(gameManagers, Entities.GRAVE_TYRANT);
        this.summonCooldown = new Cooldown(getConfig().boss.BOSS_ZOMBIE_SUMMON_INTERVAL, true);
        this.summonedMinionIds = new Set();
        this.setMovementStrategy(new MeleeMovementStrategy());
        this.setAttackStrategy(new MeleeAttackStrategy());
    }
    updateEnemy(deltaTime) {
        super.updateEnemy(deltaTime);
        this.updateSummoning(deltaTime);
    }
    updateSummoning(deltaTime) {
        const destructible = this.getExt(Destructible);
        if (destructible.isDead()) {
            return;
        }
        this.cleanupSummonedMinions();
        this.summonCooldown.update(deltaTime);
        if (!this.summonCooldown.isReady()) {
            return;
        }
        const availableSlots = getConfig().boss.BOSS_ZOMBIE_MAX_SUMMONED_MINIONS - this.summonedMinionIds.size;
        if (availableSlots <= 0) {
            return;
        }
        const spawnCount = Math.min(getConfig().boss.BOSS_ZOMBIE_SUMMON_BATCH_SIZE, availableSlots);
        const summons = [];
        for (let i = 0; i < spawnCount; i++) {
            const spawnPosition = this.findValidSpawnPosition();
            if (!spawnPosition) {
                continue;
            }
            const minion = ZombieFactory.createZombie("regular", this.getGameManagers(), {
                position: spawnPosition,
                addToManager: true,
            });
            this.summonedMinionIds.add(minion.getId());
            summons.push({ x: spawnPosition.x, y: spawnPosition.y });
        }
        if (summons.length > 0) {
            this.broadcastSummonEvent(summons);
            this.summonCooldown.reset();
        }
    }
    cleanupSummonedMinions() {
        const entityManager = this.getEntityManager();
        for (const minionId of Array.from(this.summonedMinionIds)) {
            const entity = entityManager.getEntityById(minionId);
            if (!entity || entity.getType() !== Entities.ZOMBIE) {
                this.summonedMinionIds.delete(minionId);
                continue;
            }
            if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) {
                this.summonedMinionIds.delete(minionId);
            }
        }
    }
    findValidSpawnPosition() {
        const positionable = this.getExt(Positionable);
        const center = positionable.getCenterPosition();
        const mapManager = this.getGameManagers().getMapManager();
        return mapManager.findRandomValidSpawnPosition(center, getConfig().boss.BOSS_ZOMBIE_MIN_SUMMON_RADIUS, getConfig().boss.BOSS_ZOMBIE_SUMMON_RADIUS);
    }
    broadcastSummonEvent(summons) {
        this.getGameManagers()
            .getBroadcaster()
            .broadcastEvent(new BossSummonEvent({ bossId: this.getId(), summons }));
    }
}
