export interface Extension {
  serialize: () => ExtensionSerialized;
  update?: (deltaTime: number) => void;
  // Required dirty tracking methods - all extensions must support dirty tracking
  isDirty: () => boolean;
  markDirty: () => void;
  clearDirty: () => void;
  serializeDirty?: () => ExtensionSerialized | null;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}
