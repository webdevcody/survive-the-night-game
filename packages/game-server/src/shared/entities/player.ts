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
} from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { Input } from "../../server";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";

export const FIRE_COOLDOWN = 0.4;

export class Player extends Entity implements Movable, Positionable, Updatable, Collidable {
  private fireCooldown = 0;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1,
    dx: 0,
    dy: 0,
    harvest: false,
    fire: false,
  };
  private inventory: InventoryItem[] = [
    {
      key: "Knife",
      hotbarPosition: 0,
    },
    {
      key: "Pistol",
      hotbarPosition: 1,
    },
    {
      key: "Shotgun",
      hotbarPosition: 2,
    },
  ];
  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_HEIGHT = 16;
  private static readonly PLAYER_SPEED = 60;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.PLAYER);
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
      velocity: this.velocity,
    };
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: Player.PLAYER_WIDTH,
      height: Player.PLAYER_HEIGHT,
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

  update(deltaTime: number) {
    this.handleAttack(deltaTime);
    this.handleMovement(deltaTime);
  }

  setInput(input: Input) {
    this.input = input;
  }
}
