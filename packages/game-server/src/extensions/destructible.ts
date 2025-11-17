import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Positionable from "@/extensions/positionable";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

type DestructibleDeathHandler = () => void;
type DestructibleDamagedHandler = () => void;

export default class Destructible extends ExtensionBase {
  public static readonly type = "destructible";

  private offset = PoolManager.getInstance().vector2.claim(0, 0);
  private deathHandler: DestructibleDeathHandler | null = null;
  private onDamagedHandler: DestructibleDamagedHandler | null = null;

  public constructor(self: IEntity) {
    super(self, { health: 0, maxHealth: 0 });
  }

  public onDeath(deathHandler: DestructibleDeathHandler): this {
    this.deathHandler = deathHandler;
    return this;
  }

  public setOffset(offset: Vector2): this {
    this.offset.reset(offset.x, offset.y);
    return this;
  }

  public onDamaged(onDamagedHandler: DestructibleDamagedHandler): this {
    this.onDamagedHandler = onDamagedHandler;
    return this;
  }

  public setHealth(health: number): this {
    const serialized = this.serialized as any;
    serialized.health = health;
    return this;
  }

  public setMaxHealth(maxHealth: number): this {
    const serialized = this.serialized as any;
    serialized.maxHealth = maxHealth;
    return this;
  }

  public damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    const serialized = this.serialized as any;
    serialized.health = Math.max(0, serialized.health - damage);
    this.onDamagedHandler?.();

    if (this.isDead()) {
      this.deathHandler?.();
    }
  }

  public kill(): void {
    const serialized = this.serialized as any;
    serialized.health = 0;
    this.deathHandler?.();
  }

  public getDamageBox(): Rectangle {
    const poolManager = PoolManager.getInstance();
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();
    const adjustedPos = poolManager.vector2.claim(
      position.x + this.offset.x,
      position.y + this.offset.y
    );
    const rect = poolManager.rectangle.claim(adjustedPos, size);
    poolManager.vector2.release(adjustedPos);
    return rect;
  }

  public heal(amount: number): void {
    if (this.isDead()) {
      return;
    }
    const serialized = this.serialized as any;
    serialized.health = Math.min(serialized.health + amount, serialized.maxHealth);
  }

  public isDead(): boolean {
    const serialized = this.serialized as any;
    return serialized.health === 0;
  }

  public getHealth(): number {
    const serialized = this.serialized as any;
    return serialized.health;
  }

  public getMaxHealth(): number {
    const serialized = this.serialized as any;
    return serialized.maxHealth;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Destructible.type));

    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      const fieldsToWrite: Array<{ index: number; value: number }> = [];

      // Field indices: health = 0, maxHealth = 1
      if (dirtyFields.has("health")) {
        fieldsToWrite.push({ index: 0, value: serialized.health });
      }
      if (dirtyFields.has("maxHealth")) {
        fieldsToWrite.push({ index: 1, value: serialized.maxHealth });
      }

      writer.writeUInt8(fieldsToWrite.length);
      for (const field of fieldsToWrite) {
        writer.writeUInt8(field.index);
        writer.writeFloat64(field.value);
      }
    } else {
      // Write all fields: field count = 2, then fields in order
      writer.writeUInt8(2); // field count
      writer.writeUInt8(0); // health index
      writer.writeFloat64(serialized.health);
      writer.writeUInt8(1); // maxHealth index
      writer.writeFloat64(serialized.maxHealth);
    }
  }
}
