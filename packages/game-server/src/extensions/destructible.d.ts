import { IEntity } from "@/entities/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type DestructibleDeathHandler = (killerId?: number) => void;
type DestructibleDamagedHandler = (attackerId?: number, damage?: number) => void;
type DestructibleBeforeDamageHandler = (damage: number, attackerId?: number) => number;
type DestructibleFields = {
    health: number;
    maxHealth: number;
};
export default class Destructible extends ExtensionBase<DestructibleFields> {
    static readonly type = "destructible";
    private offset;
    private deathHandler;
    private onDamagedHandler;
    private onBeforeDamageHandler;
    constructor(self: IEntity);
    onDeath(deathHandler: DestructibleDeathHandler): this;
    setOffset(offset: Vector2): this;
    onDamaged(onDamagedHandler: DestructibleDamagedHandler): this;
    /** Adjust incoming damage (e.g. evade / mitigation). Return value must be >= 0. */
    onBeforeDamage(handler: DestructibleBeforeDamageHandler): this;
    setHealth(health: number): this;
    setMaxHealth(maxHealth: number): this;
    damage(damage: number, attackerId?: number): void;
    kill(killerId?: number): void;
    getDamageBox(): Rectangle;
    heal(amount: number): void;
    isDead(): boolean;
    getHealth(): number;
    getMaxHealth(): number;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
