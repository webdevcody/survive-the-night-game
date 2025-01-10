import { Extension, ExtensionSerialized } from "./types";
import { Entity } from "../entity";
import { Hitbox } from "../traits";
import Positionable from "./positionable";

type DestructibleDeathHandler = () => void;

export default class Destructible implements Extension {
  public static readonly type = "destructible";

  private self: Entity;
  private health = 0;
  private maxHealth = 0;
  private deathHandler: DestructibleDeathHandler | null = null;

  public constructor(self: Entity) {
    this.self = self;
  }

  public onDeath(deathHandler: DestructibleDeathHandler): this {
    this.deathHandler = deathHandler;
    return this;
  }

  public setHealth(health: number): this {
    this.health = health;
    return this;
  }

  public setMaxHealth(maxHealth: number): this {
    this.maxHealth = maxHealth;
    return this;
  }

  public damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    this.health -= damage;

    if (this.isDead()) {
      this.deathHandler?.();
    }
  }

  public getDamageBox(): Hitbox {
    const positionable = this.self.getExt(Positionable);

    return {
      ...positionable.getPosition(),
      width: positionable.getSize(),
      height: positionable.getSize(),
    };
  }

  public heal(amount: number): void {
    if (this.isDead()) {
      return;
    }
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  public isDead(): boolean {
    return this.health === 0;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public deserialize(data: ExtensionSerialized): this {
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Destructible.type,
      health: this.health,
      maxHealth: this.maxHealth,
    };
  }
}
