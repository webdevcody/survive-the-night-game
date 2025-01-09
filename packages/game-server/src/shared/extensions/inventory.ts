import { Entity } from "../entities";
import { Extension, ExtensionSerialized } from "./types";
import { InventoryItem, ITEM_TYPES, ItemType } from "../inventory";
import { recipes, RecipeType } from "../recipes";
import { Broadcaster, ServerSocketManager } from "../../managers/server-socket-manager";
import { PlayerPickedUpItemEvent } from "../events/server-sent/pickup-item-event";
import { Positionable } from "./index";

export default class Inventory implements Extension {
  public static readonly type = "inventory";
  public static readonly MAX_SLOTS = 8;

  private self: Entity;
  private items: InventoryItem[] = [];
  private broadcaster: Broadcaster;

  public constructor(self: Entity, broadcaster: Broadcaster) {
    this.self = self;
    this.broadcaster = broadcaster;
  }

  public getItems(): InventoryItem[] {
    return this.items;
  }

  public isFull(): boolean {
    return this.items.length >= Inventory.MAX_SLOTS;
  }

  public hasItem(key: ItemType): boolean {
    return this.items.some((it) => it.key === key);
  }

  public addItem(item: InventoryItem): void {
    if (this.isFull()) return;

    this.items.push(item);
    this.broadcaster.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: this.self.getId(),
        itemKey: item.key,
      })
    );
  }

  public removeItem(index: number): InventoryItem | undefined {
    return this.items.splice(index, 1)[0];
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    const activeKey = activeItem?.key ?? "";
    return ["knife", "shotgun", "pistol"].includes(activeKey) ? activeItem : null;
  }

  public craftRecipe(recipe: RecipeType): void {
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) return;
    this.items = foundRecipe.craft(this.items);
  }

  public addRandomItem(chance = 1): this {
    const items = ITEM_TYPES;
    if (Math.random() < chance) {
      const item = { key: items[Math.floor(Math.random() * items.length)] };
      this.addItem(item);
    }
    return this;
  }

  public scatterItems(position: { x: number; y: number }): void {
    const offset = 32;
    this.items.forEach((item) => {
      const entity = this.createEntityFromItem(item);
      const theta = Math.random() * 2 * Math.PI;
      const radius = Math.random() * offset;
      const pos = {
        x: position.x + radius * Math.cos(theta),
        y: position.y + radius * Math.sin(theta),
      };

      if ("setPosition" in entity) {
        (entity as any).setPosition(pos);
      } else if (entity.hasExt(Positionable)) {
        entity.getExt(Positionable).setPosition(pos);
      }

      this.self.getEntityManager()?.addEntity(entity);
    });
    this.items = [];
  }

  private createEntityFromItem(item: InventoryItem) {
    // This will be injected by the entity factory
    return this.self.getEntityManager()!.createEntityFromItem(item);
  }

  public deserialize(data: ExtensionSerialized): this {
    if (data.items) {
      this.items = data.items;
    }
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Inventory.type,
      items: this.items,
    };
  }
}
