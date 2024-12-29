import { Entities, Entity, RawEntity } from "../entities";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";
import { Damageable, Interactable, Hitbox, InteractableKey } from "../traits";
import { Movable, PositionableTrait, Updatable } from "../traits";
import { distance, normalizeVector, Vector2 } from "../physics";
import { Direction } from "../direction";
import { InventoryItem, ItemType } from "../inventory";
import { RecipeType } from "../recipes";
import { PlayerDeathEvent } from "../../index";
import { Cooldown } from "./util/cooldown";
import { Input } from "../input";
import { Consumable, Interactive, Positionable, Inventory, Collidable } from "../extensions";
import { PlayerHurtEvent } from "../events/server-sent/player-hurt-event";
import { PlayerAttackedEvent } from "../events/server-sent/player-attacked-event";
import { PlayerDroppedItemEvent } from "../events/server-sent/player-dropped-item-event";
import { ServerSocketManager } from "../../managers/server-socket-manager";
import { DEBUG_WEAPONS } from "../../config";
import { Bandage } from "./items/bandage";

export class Player extends Entity implements Movable, Updatable, Damageable {
  public static readonly MAX_HEALTH = 3;
  public static readonly MAX_INTERACT_RADIUS = 20;

  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_HEIGHT = 16;
  private static readonly PLAYER_SPEED = 60;
  private static readonly DROP_COOLDOWN = 0.5;
  private static readonly HARVEST_COOLDOWN = 0.5;
  private static readonly FIRE_COOLDOWN = 0.4;
  private static readonly CONSUME_COOLDOWN = 0.5;

  private fireCooldown = new Cooldown(Player.FIRE_COOLDOWN);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN);
  private interactCooldown = new Cooldown(Player.HARVEST_COOLDOWN);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN);
  private velocity: Vector2 = { x: 0, y: 0 };
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
  };
  private health = Player.MAX_HEALTH;
  private isCrafting = false;
  private socketManager: ServerSocketManager;

  constructor(entityManager: EntityManager, socketManager: ServerSocketManager) {
    super(entityManager, Entities.PLAYER);
    this.socketManager = socketManager;

    this.extensions = [
      new Inventory(this as any, socketManager),
      new Collidable(this).setSize(Player.PLAYER_WIDTH),
      new Positionable(this),
    ];

    if (DEBUG_WEAPONS) {
      const inventory = this.getExt(Inventory);
      [
        { key: "Knife" as const },
        { key: "Pistol" as const },
        { key: "Shotgun" as const },
        { key: "Wood" as const },
        { key: "Wall" as const },
        { key: "Wall" as const },
        { key: "Wall" as const },
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
    return this.health <= 0;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return Player.MAX_HEALTH;
  }

  getDamageBox(): Hitbox {
    return {
      x: this.getPosition().x,
      y: this.getPosition().y,
      width: Player.PLAYER_WIDTH,
      height: Player.PLAYER_HEIGHT,
    };
  }

  damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    this.health = Math.max(this.health - damage, 0);

    this.socketManager.broadcastEvent(new PlayerHurtEvent(this.getId()));

    if (this.health <= 0) {
      this.onDeath();
    }
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
    return positionable.getPosition();
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      inventory: this.getExt(Inventory).getItems(),
      activeItem: this.activeItem,
      velocity: this.velocity,
      health: this.health,
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
      this.velocity = { x: 0, y: 0 };
      return;
    }

    const normalized = normalizeVector({ x: dx, y: dy });
    this.velocity = {
      x: normalized.x * Player.PLAYER_SPEED,
      y: normalized.y * Player.PLAYER_SPEED,
    };
  }

  setVelocity(velocity: Vector2) {
    this.velocity = velocity;
  }

  getVelocity(): Vector2 {
    return this.velocity;
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

      if (activeWeapon.key === "Pistol") {
        const bullet = new Bullet(this.getEntityManager());
        bullet.setPosition({
          x: this.getPosition().x + Player.PLAYER_WIDTH / 2,
          y: this.getPosition().y + Player.PLAYER_HEIGHT / 2,
        });
        bullet.setDirection(this.input.facing);
        this.getEntityManager().addEntity(bullet);

        this.socketManager.broadcastEvent(
          new PlayerAttackedEvent({
            playerId: this.getId(),
            weaponKey: activeWeapon.key,
          })
        );
      } else if (activeWeapon.key === "Shotgun") {
        // Create 3 bullets with spread
        const spreadAngle = 8; // degrees
        for (let i = -1; i <= 1; i++) {
          const bullet = new Bullet(this.getEntityManager());
          bullet.setPosition({
            x: this.getPosition().x + Player.PLAYER_WIDTH / 2,
            y: this.getPosition().y + Player.PLAYER_HEIGHT / 2,
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
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    position.x += this.velocity.x * deltaTime;
    positionable.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.x = previousX;
      positionable.setPosition(position);
    }

    position.y += this.velocity.y * deltaTime;
    positionable.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.y = previousY;
      positionable.setPosition(position);
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
          return InteractableKey in entity || entity.hasExt(Interactive);
        });

      const byProximity = entities.sort((a, b) => {
        const p1 =
          "getPosition" in a
            ? (a as unknown as PositionableTrait).getPosition()
            : (a as Entity).getExt(Positionable).getPosition();
        const p2 =
          "getPosition" in b
            ? (b as unknown as PositionableTrait).getPosition()
            : (b as Entity).getExt(Positionable).getPosition();
        return distance(this.getPosition(), p1) - distance(this.getPosition(), p2);
      });

      if (byProximity.length > 0) {
        const entity = byProximity[0];

        if (InteractableKey in entity) {
          (entity as Interactable).interact(this);
        } else {
          (entity as Entity).getExt(Interactive).interact(this);
        }
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

        if ("setPosition" in entity) {
          (entity as unknown as PositionableTrait).setPosition(pos);
        } else if (entity.hasExt(Positionable)) {
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

        switch (item.key) {
          case "Bandage":
            entity = new Bandage(this.getEntityManager());
            break;
          default:
            return; // Not a consumable item
        }

        entity.getExt(Consumable).consume(this, itemIndex);
      }
    }
  }

  update(deltaTime: number) {
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

  heal(amount: number): void {
    this.health = Math.min(this.health + amount, Player.MAX_HEALTH);
  }
}
