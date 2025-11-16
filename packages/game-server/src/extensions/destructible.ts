import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Positionable from "@/extensions/positionable";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";

type DestructibleDeathHandler = () => void;
type DestructibleDamagedHandler = () => void;

export default class Destructible implements Extension {
  public static readonly type = "destructible";

  private self: IEntity;
  private health = 0;
  private maxHealth = 0;
  private offset = PoolManager.getInstance().vector2.claim(0, 0);
  private deathHandler: DestructibleDeathHandler | null = null;
  private onDamagedHandler: DestructibleDamagedHandler | null = null;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public onDeath(deathHandler: DestructibleDeathHandler): this {
    this.deathHandler = deathHandler;
    return this;
  }

  public setOffset(offset: Vector2): this {
    this.offset = offset;
    return this;
  }

  public onDamaged(onDamagedHandler: DestructibleDamagedHandler): this {
    this.onDamagedHandler = onDamagedHandler;
    return this;
  }

  public setHealth(health: number): this {
    const healthChanged = this.health !== health;
    this.health = health;
    if (healthChanged) {
      this.markDirty();
    }
    return this;
  }

  public setMaxHealth(maxHealth: number): this {
    const maxHealthChanged = this.maxHealth !== maxHealth;
    this.maxHealth = maxHealth;
    if (maxHealthChanged) {
      this.markDirty();
    }
    return this;
  }

  public damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    const oldHealth = this.health;
    this.health = Math.max(0, this.health - damage);
    if (oldHealth !== this.health) {
      this.markDirty();
    }
    this.onDamagedHandler?.();

    if (this.isDead()) {
      this.deathHandler?.();
    }
  }

  public kill(): void {
    const wasDead = this.isDead();
    this.health = 0;
    if (!wasDead) {
      this.markDirty();
    }
    this.deathHandler?.();
  }

  public getDamageBox(): Rectangle {
    const poolManager = PoolManager.getInstance();
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();
    const adjustedPos = poolManager.vector2.claim(position.x + this.offset.x, position.y + this.offset.y);
    const rect = poolManager.rectangle.claim(adjustedPos, size);
    poolManager.vector2.release(adjustedPos);
    return rect;
  }

  public heal(amount: number): void {
    if (this.isDead()) {
      return;
    }
    const oldHealth = this.health;
    this.health = Math.min(this.health + amount, this.maxHealth);
    if (oldHealth !== this.health) {
      this.markDirty();
    }
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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Destructible.type));
    writer.writeFloat64(this.health);
    writer.writeFloat64(this.maxHealth);
  }
}
