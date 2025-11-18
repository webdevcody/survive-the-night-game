import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";

export interface Extension {
  serializeToBuffer: (writer: BufferWriter | MonitoredBufferWriter, onlyDirty?: boolean) => void;
  update?: (deltaTime: number) => void;
  // Required dirty tracking methods - all extensions must support dirty tracking
  isDirty: () => boolean;
  markDirty: () => void;
  clearDirty: () => void;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}
