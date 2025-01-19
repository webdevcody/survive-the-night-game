import { ImageLoader } from "@/managers/asset";
import { ClientExtension, ClientExtensionCtor } from "@/extensions/types";
import { clientExtensionsMap } from "@/extensions/index";
import { RawEntity } from "@shared/types/entity";

export abstract class ClientEntityBase {
  private id: string;
  protected imageLoader: ImageLoader;
  private extensions: ClientExtension[] = [];

  public constructor(data: RawEntity, imageLoader: ImageLoader) {
    this.id = data.id;
    this.imageLoader = imageLoader;
    this.deserialize(data);
  }

  public getId(): string {
    return this.id;
  }

  public getImageLoader(): ImageLoader {
    return this.imageLoader;
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
    // Handle extension removals first
    if (data.removedExtensions) {
      this.extensions = this.extensions.filter((ext) => {
        const type = (ext.constructor as any).type;
        return !data.removedExtensions?.includes(type);
      });
    }

    if (!data.extensions) {
      // Only warn if this is a full state update and we expect extensions
      if (data.isFullState) {
        console.warn(`No extensions found for entity ${this.id}`);
      }
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
    const newExtensions: ClientExtension[] = [...this.extensions]; // Preserve existing extensions
    const processedTypes = new Set<string>();

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
          ext = new ClientExtCtor(this as any);
          newExtensions.push(ext);
        }
        ext.deserialize(extData);
        processedTypes.add(extData.type);
      } catch (error) {
        console.error(`Error creating/updating extension ${extData.type}:`, error);
      }
    }

    // Only remove unprocessed extensions if this is a full update
    if (data.isFullState) {
      this.extensions = newExtensions.filter((ext) => {
        const type = (ext.constructor as any).type;
        return processedTypes.has(type);
      });
    } else {
      this.extensions = newExtensions;
    }
  }

  public deserializeProperty(key: string, value: any): void {
    if (key === "removedExtensions" && Array.isArray(value)) {
      // Handle extension removals
      this.extensions = this.extensions.filter((ext) => {
        const type = (ext.constructor as any).type;
        return !value.includes(type);
      });
    } else if (key === "extensions" && Array.isArray(value)) {
      // Create a map of existing extensions by their type
      const existingExtensions = new Map<string, ClientExtension>();
      for (const ext of this.extensions) {
        const type = (ext.constructor as any).type;
        if (type) {
          existingExtensions.set(type, ext);
        }
      }

      // Create and deserialize extensions (similar to full deserialize method)
      const newExtensions: ClientExtension[] = [...this.extensions]; // Preserve existing extensions
      for (const extData of value) {
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
            ext = new ClientExtCtor(this as any);
            newExtensions.push(ext);
          }
          ext.deserialize(extData);
        } catch (error) {
          console.error(`Error creating/updating extension ${extData.type}:`, error);
        }
      }

      // Update extensions list while preserving existing extensions
      this.extensions = newExtensions;
    } else {
      // Handle direct property updates
      (this as any)[key] = value;
    }
  }
}
