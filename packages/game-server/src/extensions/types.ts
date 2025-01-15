export interface Extension {
  deserialize: (data: ExtensionSerialized) => this;
  serialize: () => ExtensionSerialized;
  update?: (deltaTime: number) => void;
}

export type ExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ExtensionSerialized {
  type: string;
  [key: string]: any;
}
