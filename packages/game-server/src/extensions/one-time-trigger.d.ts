import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
interface OneTimeTriggerOptions {
    triggerRadius: number;
    targetTypes: EntityType[];
    /** If true, include players in target types based on game mode (for Battle Royale friendly fire) */
    includePlayersInBattleRoyale?: boolean;
}
type OneTimeTriggerFields = {
    hasTriggered: boolean;
    triggerRadius: number;
    targetTypes: EntityType[];
    includePlayersInBattleRoyale: boolean;
};
export default class OneTimeTrigger extends ExtensionBase<OneTimeTriggerFields> {
    static readonly type = "one-time-trigger";
    private static readonly CHECK_INTERVAL;
    private triggerRadius;
    private targetTypes;
    private includePlayersInBattleRoyale;
    private triggerCallback?;
    private checkCooldown;
    constructor(self: IEntity, options: OneTimeTriggerOptions);
    onTrigger(callback: () => void): this;
    update(deltaTime: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
