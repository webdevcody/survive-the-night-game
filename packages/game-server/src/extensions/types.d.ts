import { BufferWriter } from "@shared/util/buffer-serialization";
export interface Extension {
    serializeToBuffer: (writer: BufferWriter, onlyDirty?: boolean) => void;
    update?: (deltaTime: number) => void;
    isDirty: () => boolean;
    markDirty: () => void;
    clearDirty: () => void;
}
export type ExtensionCtor<T = any> = {
    new (...args: any[]): T;
};
export interface ExtensionSerialized {
    type: string;
    [key: string]: any;
}
