import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
type TriggerCooldownAttackerFields = {
    isReady: boolean;
};
interface TriggerCooldownAttackerOptions {
    damage: number;
    victimType: EntityType;
    cooldown: number;
    /** If true, include players in target types based on game mode (for Battle Royale friendly fire) */
    includePlayersInBattleRoyale?: boolean;
}
export default class TriggerCooldownAttacker extends ExtensionBase<TriggerCooldownAttackerFields> {
    static readonly type = "trigger-cooldown-attacker";
    private static readonly RADIUS;
    private static readonly CHECK_INTERVAL;
    private attackCooldown;
    private checkCooldown;
    private options;
    constructor(self: IEntity, options: TriggerCooldownAttackerOptions);
    getIsReady(): boolean;
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
