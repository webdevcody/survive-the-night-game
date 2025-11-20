import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import Positionable from "@/extensions/positionable";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import PoolManager from "@shared/util/pool-manager";
import { ExtensionBase } from "./extension-base";

type DestructibleDeathHandler = (killerId?: number) => void;
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
    this.serialized.set("health", health);
    return this;
  }

  public setMaxHealth(maxHealth: number): this {
    this.serialized.set("maxHealth", maxHealth);
    return this;
  }

  public damage(damage: number, attackerId?: number): void {
    if (this.isDead()) {
      return;
    }

    const currentHealth = this.serialized.get("health");
    this.serialized.set("health", Math.max(0, currentHealth - damage));
    this.onDamagedHandler?.();

    if (this.isDead()) {
      this.deathHandler?.(attackerId);
    }
  }

  public kill(killerId?: number): void {
    this.serialized.set("health", 0);
    this.deathHandler?.(killerId);
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
    const currentHealth = this.serialized.get("health");
    const maxHealth = this.serialized.get("maxHealth");
    this.serialized.set("health", Math.min(currentHealth + amount, maxHealth));
  }

  public isDead(): boolean {
    return this.serialized.get("health") === 0;
  }

  public getHealth(): number {
    return this.serialized.get("health");
  }

  public getMaxHealth(): number {
    return this.serialized.get("maxHealth");
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Destructible.type));
    const health = Math.max(0, Math.min(255, Math.round(this.serialized.get("health"))));
    const maxHealth = Math.max(0, Math.min(255, Math.round(this.serialized.get("maxHealth"))));
    writer.writeUInt8(health);
    writer.writeUInt8(maxHealth);
  }
}
