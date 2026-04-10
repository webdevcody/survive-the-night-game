import { IGameManagers } from "@/managers/types";
import { Direction } from "@shared/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { ItemState } from "@/types/entity";
export declare class MolotovCocktail extends Weapon {
    private static readonly EXPLOSION_RADIUS;
    private static readonly EXPLOSION_DAMAGE;
    private static readonly THROW_SPEED;
    private static readonly DEFAULT_THROW_DISTANCE;
    private static readonly COOLDOWN;
    static readonly DEFAULT_COUNT = 1;
    private static readonly FIRE_COUNT;
    private static readonly FIRE_SPREAD_RADIUS;
    private velocity;
    private isArmed;
    private traveledDistance;
    private targetDistance;
    private isExploded;
    private interactiveExtension;
    private throwerId;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    getCooldown(): number;
    attack(playerId: number, _position: {
        x: number;
        y: number;
    }, facing: Direction, aimAngle?: number, aimDistance?: number): void;
    private updateMolotov;
    private explode;
    private spawnFires;
}
