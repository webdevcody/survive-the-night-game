import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { ResourceType } from "@shared/util/inventory";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientResourcesBag extends BaseClientExtension {
  public static readonly type = ExtensionTypes.RESOURCES_BAG;

  private coins: number = 0;
  private resources: Map<ResourceType, number> = new Map();

  public getCoins(): number {
    return this.coins;
  }

  public getResource(resourceType: ResourceType): number {
    return this.resources.get(resourceType) || 0;
  }

  public getWood(): number {
    return this.getResource("wood");
  }

  public getCloth(): number {
    return this.getResource("cloth");
  }

  public getAllResources(): { wood: number; cloth: number } {
    return {
      wood: this.getWood(),
      cloth: this.getCloth(),
    };
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Coins as UInt16 (matches server serialization)
    this.coins = reader.readUInt16();
    // Resources in fixed order: wood, cloth (UInt16 each)
    this.resources.clear();
    this.resources.set("wood", reader.readUInt16());
    this.resources.set("cloth", reader.readUInt16());
    return this;
  }
}
