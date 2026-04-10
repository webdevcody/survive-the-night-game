import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
export declare class BossZombie extends BossEnemy {
    private summonCooldown;
    private summonedMinionIds;
    constructor(gameManagers: IGameManagers);
    protected updateEnemy(deltaTime: number): void;
    private updateSummoning;
    private cleanupSummonedMinions;
    private findValidSpawnPosition;
    private broadcastSummonEvent;
}
