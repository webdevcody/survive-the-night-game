import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { Entity } from "@/entities/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Positionable from "./positionable";
import Poison from "./poison";
import { Entities } from "@shared/constants";
import { environmentalEventsConfig } from "@shared/config/environmental-events-config";
import { Cooldown } from "@/entities/util/cooldown";
import { getConfig } from "@shared/config";
import { ToxicGasCloud } from "@/entities/environment/toxic-gas-cloud";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";

type ToxicGasCloudFields = {
  age: number;
  canReproduce: boolean;
  primaryDirectionX: number;
  primaryDirectionY: number;
  isOriginalCloud: boolean;
  permanent: boolean; // If true, cloud never expires (for Battle Royale)
};

/**
 * Extension that handles toxic gas cloud behavior: growth, poison application, and cleanup
 */
export class ToxicGasCloudExtension extends ExtensionBase<ToxicGasCloudFields> {
  public static readonly type = "toxic-gas-cloud";

  private growthCooldown: Cooldown;
  private lifetime: number = 0; // Track lifetime for all clouds (not just original)
  private readonly TILE_SIZE = getConfig().world.TILE_SIZE;

  public constructor(self: IEntity) {
    super(self, {
      age: 0,
      canReproduce: true,
      primaryDirectionX: 0,
      primaryDirectionY: 0,
      isOriginalCloud: true,
      permanent: false,
    });

    // Initialize growth cooldown
    const config = environmentalEventsConfig.TOXIC_GAS;
    this.growthCooldown = new Cooldown(config.GROWTH_INTERVAL);

    // Set random primary direction (N, S, E, W)
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 0, y: 1 }, // South
      { x: 1, y: 0 }, // East
      { x: -1, y: 0 }, // West
    ];
    const primaryDirection = directions[Math.floor(Math.random() * directions.length)];
    this.serialized.set("primaryDirectionX", primaryDirection.x);
    this.serialized.set("primaryDirectionY", primaryDirection.y);
  }

  public update(deltaTime: number): void {
    // Check if entity is marked for removal
    const entity = this.self as Entity;
    if (entity.isMarkedForRemoval()) {
      return;
    }

    const age = this.serialized.get("age") + deltaTime;
    this.serialized.set("age", age);

    // Update growth cooldown
    this.growthCooldown.update(deltaTime);

    // Update lifetime for all clouds
    this.lifetime += deltaTime;
    const config = environmentalEventsConfig.TOXIC_GAS;

    // All clouds should be removed after their lifetime expires (unless permanent)
    // Original clouds: 10 seconds
    // Spawned clouds: also 10 seconds (they inherit the same lifetime)
    // Permanent clouds (Battle Royale): never expire
    const isPermanent = this.serialized.get("permanent");
    if (!isPermanent && this.lifetime >= config.ORIGINAL_LIFETIME) {
      // Remove immediately - don't wait for prune cycle
      const entityManager = this.self.getEntityManager();
      const entityId = this.self.getId();
      entityManager.removeEntity(entityId);
      // Stop all processing immediately
      return;
    }

    // Check if entity is still valid before processing (might have been removed)
    if (entity.isMarkedForRemoval()) {
      return;
    }

    // Check for nearby players and apply poison
    this.checkForPlayers();

    // Grow cloud if cooldown is ready and can reproduce
    const canReproduce = this.serialized.get("canReproduce");
    if (canReproduce && this.growthCooldown.isReady()) {
      this.growthCooldown.reset();
      this.grow();
    }
  }

  /**
   * Check for players in cloud radius and apply poison
   */
  private checkForPlayers(): void {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getCenterPosition();
    const radius = this.TILE_SIZE / 2; // Half tile radius

    const playerTypeSet = new Set([Entities.PLAYER]);
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getPosition(), radius + 2, playerTypeSet);

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityCenter = entity.getExt(Positionable).getCenterPosition();
      const dx = position.x - entityCenter.x;
      const dy = position.y - entityCenter.y;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = radius * radius;

      if (distanceSquared < radiusSquared) {
        // Player is in cloud - apply poison if not already poisoned
        if (!entity.hasExt(Poison)) {
          entity.addExtension(new Poison(entity, 3, 1, 1)); // maxDamage: 1, damagePerTick: 1, interval: 1
        }
      }
    }
  }

  /**
   * Grow the cloud by spawning new cloud tiles
   */
  private grow(): void {
    const config = environmentalEventsConfig.TOXIC_GAS;
    const positionable = this.self.getExt(Positionable);
    const currentPos = positionable.getPosition();

    // Get primary direction from serialized
    const primaryDirX = this.serialized.get("primaryDirectionX");
    const primaryDirY = this.serialized.get("primaryDirectionY");
    const primaryDirection = { x: primaryDirX, y: primaryDirY };

    // Determine growth direction (weighted towards primary direction)
    let direction: { x: number; y: number };
    if (Math.random() < config.PRIMARY_DIRECTION_WEIGHT) {
      direction = primaryDirection;
    } else {
      // Random direction (N, S, E, W)
      const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];
      direction = directions[Math.floor(Math.random() * directions.length)];
    }

    // Calculate new position
    const newX = currentPos.x + direction.x * this.TILE_SIZE;
    const newY = currentPos.y + direction.y * this.TILE_SIZE;

    // Check bounds (map size)
    const { TILE_SIZE, BIOME_SIZE, MAP_SIZE } = getConfig().world;
    const mapSize = TILE_SIZE * BIOME_SIZE * MAP_SIZE;
    if (newX < 0 || newX >= mapSize || newY < 0 || newY >= mapSize) {
      return;
    }

    // Request spawn through EnvironmentalEventManager (checks grid to prevent duplicates)
    const poolManager = PoolManager.getInstance();
    const newPos = poolManager.vector2.claim(newX, newY);

    // Get EnvironmentalEventManager from entity
    const toxicGasCloud = this.self as any;
    const eventManager = toxicGasCloud.getEnvironmentalEventManager?.();

    if (eventManager) {
      const spawned = eventManager.requestSpawnCloud(
        newPos,
        false, // isOriginalCloud
        this.serialized.get("canReproduce"),
        primaryDirection
      );
      // If spawn failed (tile occupied), silently return
    } else {
      // Fallback: if event manager not available, don't spawn (shouldn't happen)
      console.warn("[ToxicGasCloud] EnvironmentalEventManager not available");
    }

    poolManager.vector2.release(newPos);
  }

  /**
   * Set whether this cloud can reproduce (spawn new clouds)
   */
  public setCanReproduce(canReproduce: boolean): void {
    this.serialized.set("canReproduce", canReproduce);
  }

  /**
   * Set whether this is an original spawn cloud
   */
  public setIsOriginalCloud(isOriginal: boolean): void {
    this.serialized.set("isOriginalCloud", isOriginal);
  }

  /**
   * Set primary growth direction
   */
  public setPrimaryDirection(direction: { x: number; y: number }): void {
    this.serialized.set("primaryDirectionX", direction.x);
    this.serialized.set("primaryDirectionY", direction.y);
  }

  /**
   * Set whether this cloud is permanent (never expires)
   */
  public setPermanent(permanent: boolean): void {
    this.serialized.set("permanent", permanent);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(ToxicGasCloudExtension.type));
    writer.writeFloat64(this.serialized.get("age"));
    writer.writeBoolean(this.serialized.get("canReproduce"));
    writer.writeFloat64(this.serialized.get("primaryDirectionX"));
    writer.writeFloat64(this.serialized.get("primaryDirectionY"));
    writer.writeBoolean(this.serialized.get("isOriginalCloud"));
    writer.writeBoolean(this.serialized.get("permanent"));
  }
}
