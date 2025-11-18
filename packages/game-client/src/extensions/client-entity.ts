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
import {
  FIELD_TYPE_STRING,
  FIELD_TYPE_NUMBER,
  FIELD_TYPE_BOOLEAN,
  FIELD_TYPE_OBJECT,
} from "@shared/util/serialization-constants";

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

    // Read field count (server writes this even though fields are commented out)
    const fieldCount = currentReader.readUInt8();
    // Fields are not currently serialized, so we skip reading them
    // for (let i = 0; i < fieldCount; i++) {
    //   const fieldName = currentReader.readString();
    //   const valueType = currentReader.readUInt8();
    //   let value: any;
    //   if (valueType === FIELD_TYPE_STRING) {
    //     const strValue = currentReader.readString();
    //     // Handle null values (empty string represents null for nullable fields)
    //     if (fieldName === "inputConsumeItemType" && strValue === "") {
    //       value = null;
    //     } else {
    //       value = strValue;
    //     }
    //   } else if (valueType === FIELD_TYPE_NUMBER) {
    //     // Special cases for field-specific deserialization
    //     if (fieldName === "ping") {
    //       value = currentReader.readUInt16();
    //     } else if (fieldName === "inputFacing" || fieldName === "inputInventoryItem") {
    //       // Input fields that are UInt8
    //       value = currentReader.readUInt8();
    //     } else if (fieldName === "inputSequenceNumber") {
    //       // Optional UInt32 field - 0xFFFFFFFF represents undefined
    //       const numValue = currentReader.readUInt32();
    //       value = numValue === 0xffffffff ? undefined : numValue;
    //     } else if (fieldName === "inputAimAngle") {
    //       // Optional Float64 field - NaN represents undefined
    //       const numValue = currentReader.readFloat64();
    //       value = isNaN(numValue) ? undefined : numValue;
    //     } else {
    //       value = currentReader.readFloat64();
    //     }
    //   } else if (valueType === FIELD_TYPE_BOOLEAN) {
    //     value = currentReader.readBoolean();
    //   } else if (valueType === FIELD_TYPE_OBJECT) {
    //     const jsonStr = currentReader.readString();
    //     try {
    //       value = JSON.parse(jsonStr);
    //     } catch {
    //       value = jsonStr;
    //     }
    //   } else {
    //     // Unknown type - fallback to reading as string
    //     value = currentReader.readString();
    //   }
    //   (this as any)[fieldName] = value;
    // }

    const extensionCount = currentReader.readUInt8();
    const existingExtensions = new Map<string, ClientExtension>();
    for (const ext of this.extensions) {
      const extType = (ext.constructor as any).type;
      if (extType) {
        existingExtensions.set(extType, ext);
      }
    }

    const processedTypes = new Set<string>();
    // Extensions are written directly without length prefixes on the server
    // Format: [extensionType (UInt8)][extensionData...]
    // Read them sequentially from the current position
    for (let i = 0; i < extensionCount; i++) {
      // Read extension type first to identify which extension this is
      // The server writes the type byte, but client extensions don't read it
      const encodedType = currentReader.readUInt8();
      const extensionType = decodeExtensionType(encodedType);

      const ClientExtCtor = clientExtensionsMap[extensionType as keyof typeof clientExtensionsMap];
      if (!ClientExtCtor) {
        console.warn(`No client extension found for type: ${extensionType}`);
        // Can't skip unknown extension without knowing its size
        // This will cause deserialization to fail - better to throw
        throw new Error(`Unknown extension type: ${extensionType}`);
      }

      try {
        // Extension reader starts at current position (after type byte)
        // Client extensions don't read the type byte, they just read their data
        const extensionReader = currentReader;

        let ext = existingExtensions.get(extensionType);
        if (!ext) {
          ext = new ClientExtCtor(this as any);
          this.extensions.push(ext);
        }

        // Deserialize the extension (reads data only, not type byte)
        ext.deserializeFromBuffer(extensionReader);

        // currentReader is automatically advanced by the extension's read operations
        processedTypes.add(extensionType);
      } catch (error) {
        console.error(`Error deserializing extension ${extensionType}:`, error);
        throw error;
      }
    }

    const removedCount = currentReader.readUInt8();
    const removedTypes: string[] = [];
    for (let i = 0; i < removedCount; i++) {
      const encodedType = currentReader.readUInt8();
      removedTypes.push(decodeExtensionType(encodedType));
    }

    if (removedTypes.length > 0) {
      this.extensions = this.extensions.filter((ext) => {
        const type = (ext.constructor as any).type;
        return !removedTypes.includes(type);
      });
    }
  }
}
