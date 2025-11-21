import { BufferReader } from "@shared/util/buffer-serialization";

export interface ClientExtension {
  deserialize: (data: ClientExtensionSerialized) => this;
  deserializeFromBuffer: (reader: BufferReader) => this;
}

export type ClientExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ClientExtensionSerialized {
  type: string;
  [key: string]: any;
}
