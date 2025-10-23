import { ImageLoader } from "@/managers/asset";
import { ClientExtension, ClientExtensionCtor } from "@/extensions/types";
import { clientExtensionsMap } from "@/extensions/index";
import { EntityType, RawEntity } from "@shared/types/entity";
import Vector2 from "@shared/util/vector2";
import { EntityCategory, EntityCategories } from "@shared/entities";

export abstract class ClientEntityBase {
  private id: string;
  private type: EntityType;
  protected imageLoader: ImageLoader;
  private extensions: ClientExtension[] = [];
  private static readonly LERP_FACTOR = 0.2;

  public constructor(data: RawEntity, imageLoader: ImageLoader) {
    this.id = data.id;
    this.type = data.type;
    this.imageLoader = imageLoader;
    this.deserialize(data);
  }

  public getType(): EntityType {
    return this.type;
  }

  public getCategory(): EntityCategory {
    // Default implementation - subclasses should override
    return EntityCategories.ITEM;
  }

  public lerpPosition(target: Vector2, current: Vector2): Vector2 {
    const distance = target.distance(current);
    if (distance > 100) {
      return target.clone();
    }
    return new Vector2(
      current.x + (target.x - current.x) * ClientEntityBase.LERP_FACTOR,
      current.y + (target.y - current.y) * ClientEntityBase.LERP_FACTOR
    );
  }

  public getId(): string {
    return this.id;
  }

  public getImageLoader(): ImageLoader {
    return this.imageLoader;
  }

  public hasExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): boolean {
    return this.extensions.some((ext) => ext instanceof ctor);
  }

  public getExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): T {
    const ext = this.extensions.find((ext) => ext instanceof ctor);
    if (!ext) {
      console.error(
        `Extension ${ctor.name} not found for entity ${this.id}. Available extensions:`,
        this.extensions.map((e) => e.constructor.name),
        "\nExtension types:",
        this.extensions.map((e) => (e.constructor as any).type)
      );
      throw new Error(`Extension ${ctor.name} not found`);
    }
    return ext as T;
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
