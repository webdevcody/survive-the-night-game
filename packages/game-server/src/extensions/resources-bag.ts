import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { ResourceType } from "@shared/util/inventory";
import { resourceRegistry } from "@shared/entities";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpResourceEvent } from "@shared/events/server-sent/pickup-resource-event";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

export default class ResourcesBag extends ExtensionBase {
  public static readonly type = "resources-bag";

  private broadcaster: Broadcaster;
  private resources: Map<ResourceType, number> = new Map();

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    // Initialize serialized with coins and empty resources record
    const initialResources: Record<string, number> = {};
    resourceRegistry.getAllResourceTypes().forEach((resource) => {
      initialResources[resource] = 0;
      // Also initialize the Map for internal use
    });
    super(self, { coins: 0, resources: initialResources });
    this.broadcaster = broadcaster;

    // Initialize all resources to 0 in Map
    resourceRegistry.getAllResourceTypes().forEach((resource) => {
      this.resources.set(resource as ResourceType, 0);
    });
  }

  public getCoins(): number {
    const serialized = this.serialized as any;
    return serialized.coins;
  }

  public addCoins(amount: number): void {
    if (amount !== 0) {
      const serialized = this.serialized as any;
      serialized.coins += amount;
    }
  }

  public setCoins(amount: number): void {
    const serialized = this.serialized as any;
    serialized.coins = Math.max(0, amount);
  }

  public getResource(resourceType: ResourceType): number {
    return this.resources.get(resourceType) || 0;
  }

  public addResource(resourceType: ResourceType, amount: number): void {
    if (amount <= 0) return;

    const currentAmount = this.resources.get(resourceType) || 0;
    this.resources.set(resourceType, currentAmount + amount);
    this.markDirty();

    // Broadcast resource pickup event
    this.broadcaster.broadcastEvent(
      new PlayerPickedUpResourceEvent({
        playerId: this.self.getId(),
        resourceType,
      })
    );
  }

  public setResource(resourceType: ResourceType, amount: number): void {
    const newAmount = Math.max(0, amount);
    this.resources.set(resourceType, newAmount);
    
    // Update serialized resources
    const serialized = this.serialized as any;
    serialized.resources = { ...serialized.resources, [resourceType]: newAmount };
  }

  public removeResource(resourceType: ResourceType, amount: number): void {
    const currentAmount = this.resources.get(resourceType) || 0;
    const newAmount = Math.max(0, currentAmount - amount);
    this.resources.set(resourceType, newAmount);
    
    // Update serialized resources
    const serialized = this.serialized as any;
    serialized.resources = { ...serialized.resources, [resourceType]: newAmount };
  }

  // Backward compatibility getters/setters for wood
  public getWood(): number {
    return this.getResource("wood");
  }

  public setWood(amount: number): void {
    this.setResource("wood", amount);
  }

  public removeWood(amount: number): void {
    this.removeResource("wood", amount);
  }

  // Backward compatibility getters/setters for cloth
  public getCloth(): number {
    return this.getResource("cloth");
  }

  public setCloth(amount: number): void {
    this.setResource("cloth", amount);
  }

  public removeCloth(amount: number): void {
    this.removeResource("cloth", amount);
  }

  public getAllResources(): { wood: number; cloth: number } {
    return {
      wood: this.getWood(),
      cloth: this.getCloth(),
    };
  }

  public serializeToBuffer(writer: BufferWriter): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(ResourcesBag.type));
    writer.writeFloat64(serialized.coins);
    // Serialize resources from serialized (already a record)
    writer.writeRecord(serialized.resources, (value) => writer.writeFloat64(value));
  }
}


