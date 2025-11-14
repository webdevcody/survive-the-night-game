import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ResourceType } from "@shared/util/inventory";

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

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.coins !== undefined) {
      this.coins = data.coins;
    }

    if (data.resources && typeof data.resources === "object") {
      // Update resources from serialized data
      for (const [key, value] of Object.entries(data.resources)) {
        if (typeof value === "number") {
          this.resources.set(key as ResourceType, value);
        }
      }
    }

    return this;
  }
}


