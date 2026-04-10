import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type InteractiveHandler = (entityId: number) => void;
type InteractiveFields = {
    displayName: string;
    offset: {
        x: number;
        y: number;
    };
    autoPickupEnabled: boolean;
};
export default class Interactive extends ExtensionBase<InteractiveFields> {
    static readonly type = "interactive";
    private handler;
    private offset;
    constructor(self: IEntity);
    onInteract(handler: InteractiveHandler): this;
    setOffset(offset: Vector2): this;
    getOffset(): Vector2;
    setDisplayName(name: string): this;
    getDisplayName(): string;
    setAutoPickupEnabled(enabled: boolean): this;
    getAutoPickupEnabled(): boolean;
    interact(entityId: number): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
