import { AssetManager } from "@/managers/asset";
import { ClientExtension, ClientExtensionCtor } from "./types";
import { clientExtensionsMap } from "./index";
import { RawEntity } from "@survive-the-night/game-shared";

export abstract class ClientEntityBase {
  private id: string;
  protected assetManager: AssetManager;
  private extensions: ClientExtension[] = [];

  public constructor(data: RawEntity, assetManager: AssetManager) {
    this.id = data.id;
    this.assetManager = assetManager;
    this.deserialize(data);
  }

  public getId(): string {
    return this.id;
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  public hasExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): boolean {
    return this.extensions.some((ext): ext is T => {
      const extType = (ext.constructor as any).type;
      const ctorType = (ctor as any).type;
      return extType === ctorType;
    });
  }

  public getExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): T {
    const ext = this.extensions.find((ext): ext is T => {
      const extType = (ext.constructor as any).type;
      const ctorType = (ctor as any).type;
      return extType === ctorType;
    });
    if (!ext) {
      console.error(
        `Extension ${ctor.name} not found for entity ${this.id}. Available extensions:`,
        this.extensions.map((e) => e.constructor.name),
        "\nExtension types:",
        this.extensions.map((e) => (e.constructor as any).type)
      );
      throw new Error(`Extension ${ctor.name} not found`);
    }
    return ext;
  }

  public deserialize(data: RawEntity): void {
    if (!data.extensions) {
      console.warn(`No extensions found for entity ${this.id}`);
      return;
    }

    // Create a map of existing extensions by their type
    const existingExtensions = new Map<string, ClientExtension>();
    for (const ext of this.extensions) {
      const type = (ext.constructor as any).type;
      if (type) {
        existingExtensions.set(type, ext);
      }
    }

    // Create and deserialize extensions
    const newExtensions: ClientExtension[] = [];
    for (const extData of data.extensions) {
      if (!extData.type) {
        console.warn(`Extension data missing type: ${JSON.stringify(extData)}`);
        continue;
      }

      const type = extData.type as keyof typeof clientExtensionsMap;
      const ClientExtCtor = clientExtensionsMap[type];
      if (!ClientExtCtor) {
        console.warn(`No client extension found for type: ${extData.type}`);
        continue;
      }

      try {
        // Reuse existing extension if available
        let ext = existingExtensions.get(extData.type);
        if (!ext) {
          ext = new ClientExtCtor();
        }
        ext.deserialize(extData);
        newExtensions.push(ext);
      } catch (error) {
        console.error(`Error creating/updating extension ${extData.type}:`, error);
      }
    }

    // Update extensions list
    this.extensions = newExtensions;
  }
}
