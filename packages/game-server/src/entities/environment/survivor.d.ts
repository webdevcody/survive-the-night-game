import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
export declare class Survivor extends Entity {
    private fireCooldown;
    private wanderTimer;
    private wanderDirection;
    private isWandering;
    private campsiteCenter;
    private initialSpawnPosition;
    constructor(gameManagers: IGameManagers);
    private updateSurvivor;
    private updateWanderingAtCampsite;
    private updateWanderingAtSpawn;
    private updateWandering;
    private handleMovement;
    private tryShootAtZombie;
    private shootAt;
    private onRescue;
    private onDeath;
    private onLooted;
    getIsRescued(): boolean;
}
