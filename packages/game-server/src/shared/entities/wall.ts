import { EntityManager } from "../../managers/entity-manager.js";
import { Entity, Entities, RawEntity } from "../entities.js";
import { Collidable, Damageable, Interactable, Hitbox, Positionable } from "../traits.js";
import { Vector2 } from "../physics.js";
import { Player } from "./player.js";
import { TILE_SIZE } from "../../managers/map-manager.js";

export const WALL_MAX_HEALTH = 5;

export class Wall extends Entity implements Collidable, Positionable, Interactable, Damageable {
  private position: Vector2 = {
    x: 0,
    y: 0,
  };
  private health: number = WALL_MAX_HEALTH;

  constructor(entityManager: EntityManager, health?: number) {
    super(entityManager, Entities.WALL);
    this.health = health ?? WALL_MAX_HEALTH;
  }

  heal(amount: number): void {}

  damage(damage: number): void {
    this.health -= damage;

    if (this.isDead()) {
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return WALL_MAX_HEALTH;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  interact(player: Player): void {
    if (player.isInventoryFull()) {
      return;
    }
    player.getInventory().push({
      key: "Wall",
      state: {
        health: this.health,
      },
    });
    this.getEntityManager().markEntityForRemoval(this);
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
      health: this.health,
    };
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: TILE_SIZE,
      height: TILE_SIZE,
    };
  }

  getDamageBox() {
    return this.getHitbox();
  }

  isDead(): boolean {
    return this.health <= 0;
  }
}
