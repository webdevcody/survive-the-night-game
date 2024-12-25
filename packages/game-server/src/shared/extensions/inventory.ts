import { Entity, GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { InventoryItem, ITEM_TYPES, ItemType } from "../inventory";
import { recipes, RecipeType } from "../recipes";
import { ServerSocketManager } from "../../managers/server-socket-manager";
import { PlayerDroppedItemEvent } from "../events/server-sent/player-dropped-item-event";
import { PlayerPickedUpItemEvent } from "../events/server-sent/pickup-item-event";
import { Positionable } from "./index";

export default class Inventory implements Extension {
  public static readonly Name = ExtensionNames.inventory;
  public static readonly MAX_SLOTS = 8;

  // TODO: should this be a GenericEntity or just Entity?  I need access to the entity manager.
  private self: Entity;
  private items: InventoryItem[] = [];
  private socketManager: ServerSocketManager;

  public constructor(self: Entity, socketManager: ServerSocketManager) {
    this.self = self;
    this.socketManager = socketManager;
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
    this.socketManager.broadcastEvent(
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
    return ["Knife", "Shotgun", "Pistol"].includes(activeKey) ? activeItem : null;
  }

  public craftRecipe(recipe: RecipeType): void {
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) return;
    this.items = foundRecipe.craft(this.items);
  }

  public addRandomItem(chance = 1): void {
    const items = ITEM_TYPES;
    if (Math.random() < chance) {
      const item = { key: items[Math.floor(Math.random() * items.length)] };
      this.addItem(item);
    }
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
      name: Inventory.Name,
      items: this.items,
    };
  }
}
