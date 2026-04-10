import { BaseEnemy } from "./base-enemy";
import { IGameManagers } from "@/managers/types";
import { EntityType } from "@shared/types/entity";
import { BossMetadata } from "@shared/entities";
export declare abstract class BossEnemy extends BaseEnemy {
    private static readonly MOVEMENT_EPSILON;
    private footstepTimer;
    private readonly bossMetadata;
    constructor(gameManagers: IGameManagers, entityType: EntityType);
    protected updateEnemy(deltaTime: number): void;
    private updateBossEffects;
    protected getBossMetadata(): BossMetadata;
}
