export interface Extension {
  serialize: () => ExtensionSerialized;
  update?: (deltaTime: number) => void;
  // Optional dirty tracking methods for performance optimization
  isDirty?: () => boolean;
  markDirty?: () => void;
  clearDirty?: () => void;
  serializeDirty?: () => ExtensionSerialized | null;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}
