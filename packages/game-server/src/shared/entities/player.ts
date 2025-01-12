import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";
import { Hitbox } from "../traits";
import { distance, normalizeVector, Vector2 } from "../physics";
import { Direction } from "../direction";
import { InventoryItem, ItemType } from "../inventory";
import { RecipeType } from "../recipes";
import { PlayerDeathEvent } from "../../index";
import { Cooldown } from "./util/cooldown";
import { Input } from "../input";
import {
  Consumable,
  Positionable,
  Inventory,
  Collidable,
  Destructible,
  Interactive,
  Updatable,
  Movable,
  Illuminated,
} from "../extensions";
import { PlayerHurtEvent } from "../events/server-sent/player-hurt-event";
import { PlayerAttackedEvent } from "../events/server-sent/player-attacked-event";
import { PlayerDroppedItemEvent } from "../events/server-sent/player-dropped-item-event";
import { ServerSocketManager } from "../../managers/server-socket-manager";
import { DEBUG_WEAPONS } from "../../config/debug";
import { Bandage } from "./items/bandage";
import Groupable from "../extensions/groupable";
import { Entity } from "../entity";
import { Entities, RawEntity } from "@survive-the-night/game-shared";

export class Player extends Entity {
  public static readonly MAX_HEALTH = 3;
  public static readonly MAX_INTERACT_RADIUS = 20;

  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_SPEED = 60;
  private static readonly DROP_COOLDOWN = 0.25;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly FIRE_COOLDOWN = 0.4;
  private static readonly CONSUME_COOLDOWN = 0.5;

  private fireCooldown = new Cooldown(Player.FIRE_COOLDOWN, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN, true);
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 0,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
  };
  private isCrafting = false;
  private socketManager: ServerSocketManager;

  constructor(entityManager: EntityManager, socketManager: ServerSocketManager) {
    super(entityManager, Entities.PLAYER);
    this.socketManager = socketManager;

    this.extensions = [
      new Inventory(this as any, socketManager),
      new Collidable(this).setSize(Player.PLAYER_WIDTH),
      new Positionable(this).setSize(Player.PLAYER_WIDTH),
      new Destructible(this)
        .setHealth(Player.MAX_HEALTH)
        .setMaxHealth(Player.MAX_HEALTH)
        .onDeath(() => this.onDeath()),
      new Updatable(this, this.updatePlayer.bind(this)),
      new Movable(this),
      new Illuminated(this, 200),
      new Groupable(this, "friendly"),
    ];

    if (DEBUG_WEAPONS) {
      const inventory = this.getExt(Inventory);
      [
        { key: "knife" as const },
        { key: "pistol" as const },
        { key: "shotgun" as const },
        { key: "wood" as const },
        { key: "torch" as const },
        { key: "gasoline" as const },
        { key: "spikes" as const },
      ].forEach((item) => inventory.addItem(item));
    }
  }

  get activeItem(): InventoryItem | null {
    return this.getExt(Inventory).getActiveItem(this.input.inventoryItem);
  }

  setIsCrafting(isCrafting: boolean): void {
    this.isCrafting = isCrafting;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  isDead(): boolean {
    return this.getExt(Destructible).isDead();
  }

  getHealth(): number {
    return this.getExt(Destructible).getHealth();
  }

  getMaxHealth(): number {
    return this.getExt(Destructible).getMaxHealth();
  }

  getDamageBox(): Hitbox {
    return this.getExt(Destructible).getDamageBox();
  }

  damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    this.getExt(Destructible).damage(damage);
    this.socketManager.broadcastEvent(new PlayerHurtEvent(this.getId()));
  }

  onDeath(): void {
    this.setIsCrafting(false);
    this.getExt(Inventory).scatterItems(this.getPosition());
    this.socketManager.broadcastEvent(new PlayerDeathEvent(this.getId()));
  }

  isInventoryFull(): boolean {
    return this.getExt(Inventory).isFull();
  }

  hasInInventory(key: ItemType): boolean {
    return this.getExt(Inventory).hasItem(key);
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getCenterPosition();
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      inventory: this.getExt(Inventory).getItems(),
      activeItem: this.activeItem,
      isCrafting: this.isCrafting,
      input: this.input,
    };
  }

  getHitbox(): Hitbox {
    const collidable = this.getExt(Collidable);
    const hitbox = collidable.getHitBox();
    return hitbox;
  }

  setVelocityFromInput(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      this.getExt(Movable).setVelocity({ x: 0, y: 0 });
      return;
    }

    const normalized = normalizeVector({ x: dx, y: dy });
    this.getExt(Movable).setVelocity({
      x: normalized.x * Player.PLAYER_SPEED,
      y: normalized.y * Player.PLAYER_SPEED,
    });
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getPosition();
  }

  getInventory(): InventoryItem[] {
    return this.getExt(Inventory).getItems();
  }

  getActiveWeapon(): InventoryItem | null {
    return this.getExt(Inventory).getActiveWeapon(this.activeItem);
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
  }

  craftRecipe(recipe: RecipeType): void {
    this.getExt(Inventory).craftRecipe(recipe);
    this.setIsCrafting(false);
  }

  handleAttack(deltaTime: number) {
    this.fireCooldown.update(deltaTime);

    if (!this.input.fire) return;

    const activeWeapon = this.getActiveWeapon();
    if (activeWeapon === null) return;

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();

      if (activeWeapon.key === "pistol") {
        const bullet = new Bullet(this.getEntityManager());
        bullet.setPosition({
          x: this.getCenterPosition().x,
          y: this.getCenterPosition().y,
        });
        bullet.setDirection(this.input.facing);
        this.getEntityManager().addEntity(bullet);

        this.socketManager.broadcastEvent(
          new PlayerAttackedEvent({
            playerId: this.getId(),
            weaponKey: activeWeapon.key,
          })
        );
      } else if (activeWeapon.key === "shotgun") {
        // Create 3 bullets with spread
        const spreadAngle = 8; // degrees
        for (let i = -1; i <= 1; i++) {
          const bullet = new Bullet(this.getEntityManager());
          bullet.setPosition({
            x: this.getCenterPosition().x,
            y: this.getCenterPosition().y,
          });
          bullet.setDirectionWithOffset(this.input.facing, i * spreadAngle);
          this.getEntityManager().addEntity(bullet);

          this.socketManager.broadcastEvent(
            new PlayerAttackedEvent({
              playerId: this.getId(),
              weaponKey: activeWeapon.key,
            })
          );
        }
      }
    }
  }

  handleMovement(deltaTime: number) {
    const position = this.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    position.x += velocity.x * deltaTime;
    this.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.x = previousX;
      this.setPosition(position);
    }

    position.y += velocity.y * deltaTime;
    this.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.y = previousY;
      this.setPosition(position);
    }
  }

  handleInteract(deltaTime: number) {
    this.interactCooldown.update(deltaTime);

    if (!this.input.interact) return;

    if (this.interactCooldown.isReady()) {
      this.interactCooldown.reset();
      const entities = this.getEntityManager()
        .getNearbyEntities(this.getPosition(), Player.MAX_INTERACT_RADIUS)
        .filter((entity) => {
          return entity.hasExt(Interactive);
        });

      const byProximity = entities.sort((a, b) => {
        const p1 = (a as Entity).getExt(Positionable).getPosition();
        const p2 = (b as Entity).getExt(Positionable).getPosition();
        return distance(this.getPosition(), p1) - distance(this.getPosition(), p2);
      });

      if (byProximity.length > 0) {
        const entity = byProximity[0];
        (entity as Entity).getExt(Interactive).interact(this);
      }
    }
  }

  handleDrop(deltaTime: number) {
    this.dropCooldown.update(deltaTime);

    if (!this.input.drop) return;

    if (this.dropCooldown.isReady() && this.input.inventoryItem !== null) {
      this.dropCooldown.reset();
      const itemIndex = this.input.inventoryItem - 1;
      const item = this.getExt(Inventory).removeItem(itemIndex);

      if (item) {
        const entity = this.getEntityManager().createEntityFromItem(item);

        const offset = 16;
        let dx = 0;
        let dy = 0;

        if (this.input.facing === Direction.Up) {
          dy = -offset;
        } else if (this.input.facing === Direction.Down) {
          dy = offset;
        } else if (this.input.facing === Direction.Left) {
          dx = -offset;
        } else if (this.input.facing === Direction.Right) {
          dx = offset;
        }

        const pos: Vector2 = {
          x: this.getPosition().x + dx,
          y: this.getPosition().y + dy,
        };

        if (entity.hasExt(Positionable)) {
          entity.getExt(Positionable).setPosition(pos);
        }

        this.getEntityManager().addEntity(entity);

        this.socketManager.broadcastEvent(
          new PlayerDroppedItemEvent({
            playerId: this.getId(),
            itemKey: item.key,
          })
        );
      }
    }
  }

  handleConsume(deltaTime: number) {
    this.consumeCooldown.update(deltaTime);

    if (!this.input.consume) return;

    if (this.consumeCooldown.isReady() && this.input.inventoryItem !== null) {
      this.consumeCooldown.reset();
      const itemIndex = this.input.inventoryItem - 1;
      const item = this.getExt(Inventory).getItems()[itemIndex];

      if (item) {
        let entity: Entity;

        console.log(item.key);
        // this feels hacky, I shouldn't need a switch statement here
        switch (item.key) {
          case "bandage":
            entity = new Bandage(this.getEntityManager());
            break;
          default:
            return; // Not a consumable item
        }

        entity.getExt(Consumable).consume(this, itemIndex);
      }
    }
  }

  private updatePlayer(deltaTime: number) {
    if (this.isCrafting) {
      return;
    }

    if (this.isDead()) {
      return;
    }

    this.handleAttack(deltaTime);
    this.handleMovement(deltaTime);
    this.handleInteract(deltaTime);
    this.handleDrop(deltaTime);
    this.handleConsume(deltaTime);
  }

  setInput(input: Input) {
    this.input = input;
  }

  selectInventoryItem(index: number) {
    this.input.inventoryItem = index;
  }

  setAsFiring(firing: boolean) {
    this.input.fire = firing;
  }

  setUseItem(use: boolean) {
    this.input.consume = use;
  }

  heal(amount: number): void {
    this.getExt(Destructible).heal(amount);
  }
}
