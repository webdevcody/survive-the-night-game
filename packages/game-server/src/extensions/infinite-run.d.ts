import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
/**
 * Extension that grants infinite stamina (no stamina drain) for a duration
 * Used by energy drink consumable
 */
type InfiniteRunFields = {
    duration: number;
};
export default class InfiniteRun extends ExtensionBase<InfiniteRunFields> {
    static readonly type = "infinite-run";
    private cooldown;
    constructor(self: IEntity, duration: number);
    update(deltaTime: number): void;
    getRemainingTime(): number;
    isActive(): boolean;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
