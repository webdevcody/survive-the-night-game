import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import { ResourceType } from "@shared/util/inventory";
import { resourceRegistry } from "@shared/entities";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpResourceEvent } from "@shared/events/server-sent/pickup-resource-event";

export default class ResourcesBag implements Extension {
  public static readonly type = "resources-bag";

  private self: IEntity;
  private broadcaster: Broadcaster;
  private resources: Map<ResourceType, number> = new Map();
  private coins: number = 0;
  private dirty: boolean = false;

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    this.self = self;
    this.broadcaster = broadcaster;

    // Initialize all resources to 0
    resourceRegistry.getAllResourceTypes().forEach((resource) => {
      this.resources.set(resource as ResourceType, 0);
    });
  }

  public getCoins(): number {
    return this.coins;
  }

  public addCoins(amount: number): void {
    if (amount !== 0) {
      this.coins += amount;
      this.markDirty();
    }
  }

  public setCoins(amount: number): void {
    if (this.coins !== amount) {
      this.coins = Math.max(0, amount);
      this.markDirty();
    }
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
    const currentAmount = this.resources.get(resourceType) || 0;
    const newAmount = Math.max(0, amount);
    if (currentAmount !== newAmount) {
      this.resources.set(resourceType, newAmount);
      this.markDirty();
    }
  }

  public removeResource(resourceType: ResourceType, amount: number): void {
    const currentAmount = this.resources.get(resourceType) || 0;
    const newAmount = Math.max(0, currentAmount - amount);
    if (currentAmount !== newAmount) {
      this.resources.set(resourceType, newAmount);
      this.markDirty();
    }
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

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    const resources: Record<string, number> = {};
    resourceRegistry.getAllResourceTypes().forEach((resource) => {
      resources[resource] = this.resources.get(resource as ResourceType) || 0;
    });

    return {
      type: ResourcesBag.type,
      coins: this.coins,
      resources,
    };
  }
}


