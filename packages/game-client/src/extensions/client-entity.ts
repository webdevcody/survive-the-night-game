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
  FIELD_TYPE_NULL,
} from "@shared/util/serialization-constants";

export abstract class ClientEntityBase {
  private id: number;
  private type: EntityType;
  protected imageLoader: ImageLoader;
  private extensions: Map<string, ClientExtension> = new Map();
  private static readonly LERP_FACTOR = 0.2;

  public constructor(data: RawEntity, imageLoader: ImageLoader) {
    this.id = data.id;
    this.type = data.type;
    this.imageLoader = imageLoader;
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

  public lerpPosition(target: Vector2, current: Vector2, dt?: number): Vector2 {
    const distance = target.distance(current);
    if (distance > 100) {
      return target.clone();
    }

    // Use time-based lerp if dt is provided, otherwise fallback to constant factor (for backward compatibility)
    // Formula: factor = 1 - exp(-lambda * dt)
    // Lambda ~13.4 corresponds to factor 0.2 at 60FPS (dt=0.0166)
    let factor = ClientEntityBase.LERP_FACTOR;

    if (dt !== undefined && dt > 0) {
      // Use a lambda that gives roughly 0.2 at 60fps
      // 0.2 = 1 - exp(-lambda * 0.0166) -> lambda ~ 13.4
      // Increasing slightly to 15 for snappier response
      const lambda = 15;
      factor = 1 - Math.exp(-lambda * dt);
    }

    const poolManager = PoolManager.getInstance();
    return poolManager.vector2.claim(
      current.x + (target.x - current.x) * factor,
      current.y + (target.y - current.y) * factor
    );
  }

  public getId(): number {
    return this.id;
  }

  public getImageLoader(): ImageLoader {
    return this.imageLoader;
  }

  private getExtensionType(ctor: ClientExtensionCtor): string {
    const type = (ctor as any).type;
    if (!type) {
      throw new Error(`Extension constructor ${ctor.name} does not have a static 'type' property`);
    }
    return type;
  }

  public hasExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): boolean {
    const type = this.getExtensionType(ctor);
    return this.extensions.has(type);
  }

  public getExt<T extends ClientExtension>(ctor: ClientExtensionCtor<T>): T {
    const type = this.getExtensionType(ctor);
    const ext = this.extensions.get(type);
    if (!ext) {
      console.error(
        `Extension ${ctor.name} not found for entity ${this.id}. Available extensions:`,
        Array.from(this.extensions.values()).map((e) => e.constructor.name),
        "\nExtension types:",
        Array.from(this.extensions.keys())
      );
      throw new Error(`Extension ${ctor.name} not found`);
    }
    return ext as T;
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

    // Read field count and fields
    const fieldCount = currentReader.readUInt8();

    for (let i = 0; i < fieldCount; i++) {
      const fieldName = currentReader.readString();
      const valueType = currentReader.readUInt8();
      let value: any;
      if (valueType === FIELD_TYPE_STRING) {
        value = currentReader.readString();
      } else if (valueType === FIELD_TYPE_NULL) {
        value = null;
      } else if (valueType === FIELD_TYPE_NUMBER) {
        // Read number subtype: 0=uint8, 1=uint16, 2=uint32, 3=float64
        const numberSubtype = currentReader.readUInt8();
        if (numberSubtype === 0) {
          // uint8
          value = currentReader.readUInt8();
        } else if (numberSubtype === 1) {
          // uint16
          value = currentReader.readUInt16();
        } else if (numberSubtype === 2) {
          // uint32 - check for optional field sentinel (0xFFFFFFFF)
          const numValue = currentReader.readUInt32();
          value = numValue === 0xffffffff ? undefined : numValue;
        } else {
          // float64 (subtype 3) - check for optional field sentinel (NaN)
          const numValue = currentReader.readFloat64();
          value = isNaN(numValue) ? undefined : numValue;
        }
      } else if (valueType === FIELD_TYPE_BOOLEAN) {
        value = currentReader.readBoolean();
      } else if (valueType === FIELD_TYPE_OBJECT) {
        const jsonStr = currentReader.readString();
        try {
          value = JSON.parse(jsonStr);
        } catch {
          value = jsonStr;
        }
      } else {
        // Unknown type - fallback to reading as string
        value = currentReader.readString();
      }
      // Store the value on the entity instance
      (this as any)[fieldName] = value;
    }

    const extensionCount = currentReader.readUInt8();
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

        let ext = this.extensions.get(extensionType);
        if (!ext) {
          ext = new ClientExtCtor(this as any);
          this.extensions.set(extensionType, ext);
        }

        // Deserialize the extension (reads data only, not type byte)
        ext.deserializeFromBuffer(extensionReader);

        // currentReader is automatically advanced by the extension's read operations
      } catch (error) {
        console.error(
          `Error deserializing extension ${extensionType} for entity ${this.id} (${this.type}):`,
          error
        );
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
      for (const removedType of removedTypes) {
        this.extensions.delete(removedType);
      }
    }
  }
}
