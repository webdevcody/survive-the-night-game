import { BufferReader } from "@shared/util/buffer-serialization";

export interface ClientExtension {
  deserializeFromBuffer: (reader: BufferReader) => this;
}

export type ClientExtensionCtor<T = any> = { new (...args: any[]): T };
