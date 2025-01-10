export interface ClientExtension {
  deserialize: (data: ClientExtensionSerialized) => this;
}

export type ClientExtensionCtor<T = any> = { new (...args: any[]): T };

export interface ClientExtensionSerialized {
  type: string;
  [key: string]: any;
}
