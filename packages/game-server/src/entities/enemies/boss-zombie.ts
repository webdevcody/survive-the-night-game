import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import { Cooldown } from "@/entities/util/cooldown";
import { Zombie } from "./zombie";
import Positionable from "@/extensions/positionable";
import { BossSummonEvent } from "../../../../game-shared/src/events/server-sent/events/boss-summon-event";
import Vector2 from "@shared/util/vector2";
import Destructible from "@/extensions/destructible";
import PoolManager from "@/util/pool-manager";
import { getConfig } from "@/config";

export class BossZombie extends BossEnemy {
  private static readonly SUMMON_INTERVAL_SECONDS = 8;
  private static readonly SUMMON_BATCH_SIZE = 3;
  private static readonly MAX_SUMMONED_MINIONS = 10;
  private static readonly MIN_SUMMON_RADIUS = 12;
  private static readonly SUMMON_RADIUS = 96;

  private summonCooldown = new Cooldown(BossZombie.SUMMON_INTERVAL_SECONDS, true);
  private summonedMinionIds: Set<number> = new Set();

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.GRAVE_TYRANT);
    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  protected override updateEnemy(deltaTime: number): void {
    super.updateEnemy(deltaTime);
    this.updateSummoning(deltaTime);
  }

  private updateSummoning(deltaTime: number): void {
    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    this.cleanupSummonedMinions();
    this.summonCooldown.update(deltaTime);
    if (!this.summonCooldown.isReady()) {
      return;
    }

    const availableSlots = BossZombie.MAX_SUMMONED_MINIONS - this.summonedMinionIds.size;
    if (availableSlots <= 0) {
      return;
    }

    const spawnCount = Math.min(BossZombie.SUMMON_BATCH_SIZE, availableSlots);
    const summons: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < spawnCount; i++) {
      const spawnPosition = this.findValidSpawnPosition();
      if (!spawnPosition) {
        continue;
      }
      const minion = new Zombie(this.getGameManagers());
      minion.setPosition(spawnPosition);
      this.getEntityManager().addEntity(minion);
      this.summonedMinionIds.add(minion.getId());
      summons.push({ x: spawnPosition.x, y: spawnPosition.y });
    }

    if (summons.length > 0) {
      this.broadcastSummonEvent(summons);
      this.summonCooldown.reset();
    }
  }

  private cleanupSummonedMinions(): void {
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

  private findValidSpawnPosition(): Vector2 | null {
    const positionable = this.getExt(Positionable);
    const center = positionable.getCenterPosition();
    const mapManager = this.getGameManagers().getMapManager();

    return mapManager.findRandomValidSpawnPosition(
      center,
      BossZombie.MIN_SUMMON_RADIUS,
      BossZombie.SUMMON_RADIUS
    );
  }

  private broadcastSummonEvent(summons: Array<{ x: number; y: number }>): void {
    this.getGameManagers()
      .getBroadcaster()
      .broadcastEvent(new BossSummonEvent({ bossId: this.getId(), summons }));
  }
}
