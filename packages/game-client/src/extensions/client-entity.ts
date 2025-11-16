import { ImageLoader } from "@/managers/asset";
import { ClientExtension, ClientExtensionCtor } from "@/extensions/types";
import { clientExtensionsMap } from "@/extensions/index";
import { EntityType, RawEntity } from "@shared/types/entity";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { EntityCategory, EntityCategories } from "@shared/entities";
import { BufferReader } from "@shared/util/buffer-serialization";
import { decodeExtensionType } from "@shared/util/extension-type-encoding";
import { entityTypeRegistry } from "@shared/util/entity-type-encoding";

export abstract class ClientEntityBase {
  private id: number;
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

  public getImage(): HTMLImageElement {
    return this.imageLoader.get(this.type);
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
    const poolManager = PoolManager.getInstance();
    return poolManager.vector2.claim(
      current.x + (target.x - current.x) * ClientEntityBase.LERP_FACTOR,
      current.y + (target.y - current.y) * ClientEntityBase.LERP_FACTOR
    );
  }

  public getId(): number {
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

  public deserializeFromBuffer(reader: BufferReader): void {
    let currentReader = reader;

    const id = currentReader.readUInt16();
    if (id !== this.id) {
      console.warn(`Entity ID mismatch: expected ${this.id}, got ${id}`);
    }

    // Read entity type as 1-byte numeric ID and decode to string
    const typeId = currentReader.readUInt8();
    const type = entityTypeRegistry.decode(typeId);
    if (type !== this.type) {
      console.warn(`Entity type mismatch: expected ${this.type}, got ${type}`);
    }

    const fieldCount = currentReader.readUInt32();
    for (let i = 0; i < fieldCount; i++) {
      const fieldName = currentReader.readString();
      const valueType = currentReader.readUInt32();
      let value: any;
      if (valueType === 0) {
        value = currentReader.readString();
      } else if (valueType === 1) {
        value = currentReader.readFloat64();
      } else if (valueType === 2) {
        value = currentReader.readBoolean();
      } else if (valueType === 3) {
        const jsonStr = currentReader.readString();
        try {
          value = JSON.parse(jsonStr);
        } catch {
          value = jsonStr;
        }
      } else {
        value = currentReader.readString();
      }
      (this as any)[fieldName] = value;
    }

    const extensionCount = currentReader.readUInt32();
    const existingExtensions = new Map<string, ClientExtension>();
    for (const ext of this.extensions) {
      const extType = (ext.constructor as any).type;
      if (extType) {
        existingExtensions.set(extType, ext);
      }
    }

    const processedTypes = new Set<string>();
    for (let i = 0; i < extensionCount; i++) {
      const extensionLength = currentReader.readUInt16();
      const extensionStartOffset = currentReader.getOffset();
      const extensionEndOffset = extensionStartOffset + extensionLength;

      const extensionReader = currentReader.atOffset(extensionStartOffset);
      const encodedType = extensionReader.readUInt32();
      const extensionType = decodeExtensionType(encodedType);

      const ClientExtCtor = clientExtensionsMap[extensionType as keyof typeof clientExtensionsMap];
      if (!ClientExtCtor) {
        console.warn(`No client extension found for type: ${extensionType}`);
        currentReader = currentReader.atOffset(extensionEndOffset);
        continue;
      }

      try {
        let ext = existingExtensions.get(extensionType);
        if (!ext) {
          ext = new ClientExtCtor(this as any);
          this.extensions.push(ext);
        }
        ext.deserializeFromBuffer(extensionReader);
        processedTypes.add(extensionType);
      } catch (error) {
        console.error(`Error deserializing extension ${extensionType}:`, error);
      }

      currentReader = currentReader.atOffset(extensionEndOffset);
    }

    const removedCount = currentReader.readUInt32();
    const removedTypes: string[] = [];
    for (let i = 0; i < removedCount; i++) {
      removedTypes.push(currentReader.readString());
    }

    if (removedTypes.length > 0) {
      this.extensions = this.extensions.filter((ext) => {
        const type = (ext.constructor as any).type;
        return !removedTypes.includes(type);
      });
    }
  }
}
