import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
export declare class SplitterBoss extends BossEnemy {
    private crossedThresholds;
    private lastHealth;
    constructor(gameManagers: IGameManagers, splitGeneration?: number, splitsRemaining?: number);
    private applyStatScaling;
    protected updateEnemy(deltaTime: number): void;
    private checkSplitThresholds;
    private performSplit;
}
