import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
/**
 * A level 2 sentry gun that shoots twice as fast as the base sentry gun.
 */
export declare class SentryGunLevel2 extends Entity {
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
