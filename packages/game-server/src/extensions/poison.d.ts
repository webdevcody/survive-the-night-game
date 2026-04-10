import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
/**
 * Extension that applies poison damage over time to an entity
 * Similar to Ignitable but for poison effects
 */
type PoisonFields = {
    maxDamage: number;
    totalDamage: number;
};
export default class Poison extends ExtensionBase<PoisonFields> {
    static readonly type = "poison";
    private cooldown;
    private damage;
    private damageInterval;
    constructor(self: IEntity, maxDamage?: number, damagePerTick?: number, damageInterval?: number);
    update(deltaTime: number): void;
    /**
     * Refresh the poison by resetting totalDamage to 0
     * Used by toxic zones to keep poison active while player remains in zone
     */
    refresh(): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
