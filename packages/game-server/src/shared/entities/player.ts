import {
  Direction,
  Collidable,
  Entity,
  Hitbox,
  Movable,
  Positionable,
  Updatable,
  Vector2,
  normalizeVector,
  RawEntity,
  InventoryItem,
  Harvestable,
} from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { Input } from "../../server";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";
import { Tree } from "./tree";
import { Wall } from "./wall";

export const FIRE_COOLDOWN = 0.4;
export const MAX_INVENTORY_SLOTS = 8;
export const MAX_HARVEST_RADIUS = 20;

export class Player extends Entity implements Movable, Positionable, Updatable, Collidable {
  private fireCooldown = 0;
  private dropCooldown = 0;
  private harvestCooldown = 0;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1, // 1 based index
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
    drop: false,
  };
  private activeItem: InventoryItem | null = null;
  private inventory: InventoryItem[] = [
    {
      key: "Knife",
    },
    {
      key: "Pistol",
    },
    {
      key: "Shotgun",
    },
    {
      key: "Wood",
    },
  ];
  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_HEIGHT = 16;
  private static readonly PLAYER_SPEED = 60;
  private static readonly DROP_COOLDOWN = 0.5;
  private static readonly HARVEST_COOLDOWN = 0.5;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.PLAYER);
  }

  isInventoryFull(): boolean {
    return this.inventory.length >= MAX_INVENTORY_SLOTS;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      inventory: this.inventory,
      activeItem: this.activeItem,
      position: this.position,
      velocity: this.velocity,
    };
  }

  getHitbox(): Hitbox {
    const amount = 2;
    return {
      x: this.position.x + amount,
      y: this.position.y + amount,
      width: Player.PLAYER_WIDTH - amount * 2,
      height: Player.PLAYER_HEIGHT - amount * 2,
    };
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
    return this.position;
  }

  getInventory(): InventoryItem[] {
    return this.inventory;
  }

  setPosition(position: Vector2) {
    this.position = position;
  }

  handleAttack(deltaTime: number) {
    this.fireCooldown -= deltaTime;

    if (this.input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_COOLDOWN;

      const bullet = new Bullet(this.getEntityManager());
      bullet.setPosition({
        x: this.position.x + Player.PLAYER_WIDTH / 2,
        y: this.position.y + Player.PLAYER_HEIGHT / 2,
      });
      bullet.setDirection(this.input.facing);
      this.getEntityManager().addEntity(bullet);
    }
  }

  handleMovement(deltaTime: number) {
    const previousX = this.position.x;
    const previousY = this.position.y;

    this.position.x += this.velocity.x * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      this.position.x = previousX;
    }

    this.position.y += this.velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      this.position.y = previousY;
    }
  }

  handleInteract(deltaTime: number) {
    this.harvestCooldown -= deltaTime;

    if (this.input.harvest && this.harvestCooldown <= 0) {
      this.harvestCooldown = Player.HARVEST_COOLDOWN;
      const nearbyHarvestables = this.getEntityManager()
        .getNearbyEntities(this.position, MAX_HARVEST_RADIUS)
        .filter((entity) => "harvest" in entity) as unknown as Harvestable[];
      if (nearbyHarvestables.length > 0) {
        nearbyHarvestables[0].harvest(this);
      }
    }
  }

  handleDrop(deltaTime: number) {
    this.dropCooldown -= deltaTime;

    if (this.input.drop && this.dropCooldown <= 0 && this.input.inventoryItem !== null) {
      this.dropCooldown = Player.DROP_COOLDOWN;
      const itemIndex = this.input.inventoryItem - 1;
      const item = this.inventory[itemIndex];

      if (item) {
        // Remove item from inventory
        this.inventory.splice(itemIndex, 1);

        // Create new entity based on item type
        let entity: Entity;
        switch (item.key) {
          case "Wood":
            entity = new Tree(this.getEntityManager());
            break;
          case "Wall":
            entity = new Wall(this.getEntityManager());
            break;
          default:
            console.warn("Unknown item type:", item.key);
            return;
        }

        // Position the entity at player's center
        if ("setPosition" in entity) {
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

          (entity as unknown as Positionable).setPosition({
            x: this.getPosition().x + dx,
            y: this.getPosition().y + dy,
          });
        }

        this.getEntityManager().addEntity(entity);

        // Clear active item if it was dropped
        if (this.activeItem === item) {
          this.activeItem = null;
        }
      }
    }
  }

  update(deltaTime: number) {
    if (this.input.inventoryItem !== null) {
      this.activeItem = this.inventory[this.input.inventoryItem - 1];
    }

    this.handleAttack(deltaTime);
    this.handleMovement(deltaTime);
    this.handleInteract(deltaTime);
    this.handleDrop(deltaTime);
  }

  setInput(input: Input) {
    this.input = input;
  }
}
