import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
/**
 * Extension that triggers when a player walks over acid, adding poison extension
 * Similar to TriggerCooldownAttacker but adds poison instead of dealing damage
 */
type AcidTriggerFields = {
    isReady: boolean;
};
export default class AcidTrigger extends ExtensionBase<AcidTriggerFields> {
    static readonly type = "acid-trigger";
    private static readonly RADIUS;
    private static readonly CHECK_INTERVAL;
    private triggerCooldown;
    private checkCooldown;
    private poisonMaxDamage;
    private poisonDamagePerTick;
    private poisonDamageInterval;
    constructor(self: IEntity, options: {
        triggerCooldown: number;
        poisonMaxDamage?: number;
        poisonDamagePerTick?: number;
        poisonDamageInterval?: number;
    });
    getIsReady(): boolean;
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
