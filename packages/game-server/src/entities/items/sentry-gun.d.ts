import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
/**
 * A sentry gun that automatically targets and shoots at zombies.
 * Has health, can be damaged, and acts like a normal item that can be picked up and moved.
 */
export declare class SentryGun extends Entity {
    static get Size(): Vector2;
    static readonly DEFAULT_COUNT = 1;
    private fireCooldown;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private updateSentryGun;
    private tryShootAtTarget;
    private shootAt;
    private interact;
    private onDeath;
}
