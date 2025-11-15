import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "@shared/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { distance, normalizeVector } from "@/util/physics";
import { Cooldown } from "../util/cooldown";
import { Bullet } from "@/entities/projectiles/bullet";
import { LootEvent } from "@/events/server-sent/loot-event";
import { getConfig } from "@/config";
import { BIOME_SIZE, MAP_SIZE } from "@/managers/map-manager";
import { WEAPON_TYPES } from "@/types/weapons";
import { GunFiredEvent } from "@/events/server-sent/gun-fired-event";
import { WeaponKey } from "@/util/inventory";

const SURVIVOR_MAX_HEALTH = 10;
const SURVIVOR_SIZE = new Vector2(16, 16);
const SURVIVOR_SHOOT_COOLDOWN = 1.0; // 1 second
const SURVIVOR_SHOOT_DAMAGE = 1;
const SURVIVOR_SHOOT_RANGE = 100; // Similar to sentry gun range
const SURVIVOR_WANDER_RADIUS = 100; // Max distance from campsite center
const SURVIVOR_WANDER_SPEED = 30; // Movement speed when wandering
const WANDER_MOVE_DURATION = 2.0; // Move for 2 seconds
const WANDER_PAUSE_DURATION = 2.0; // Pause for 2 seconds

const SERIALIZABLE_FIELDS = ["isRescued"] as const;

export class Survivor extends Entity<typeof SERIALIZABLE_FIELDS> {
  // Define serializable fields at the top
  protected serializableFields = SERIALIZABLE_FIELDS;

  // Internal state fields
  private fireCooldown: Cooldown;
  private wanderTimer: number = 0;
  private wanderDirection: Vector2 | null = null;
  private isWandering: boolean = false; // true = moving, false = paused
  private campsiteCenter: Vector2 | null = null;
  private initialSpawnPosition: Vector2 | null = null;

  // Serializable fields
  private isRescued: boolean = false;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.SURVIVOR);

    // Offset cooldown randomly to prevent all survivors from shooting simultaneously
    const randomOffset = Math.random() * SURVIVOR_SHOOT_COOLDOWN;
    this.fireCooldown = new Cooldown(SURVIVOR_SHOOT_COOLDOWN);
    this.fireCooldown.setTimeRemaining(randomOffset);

    this.addExtension(new Positionable(this).setSize(SURVIVOR_SIZE));
    this.addExtension(
      new Collidable(this).setSize(SURVIVOR_SIZE.div(2)).setOffset(new Vector2(4, 4))
    );
    // Don't add Destructible extension until rescued - makes survivor invincible until then
    this.addExtension(new Movable(this).setHasFriction(false));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId) => this.onRescue(entityId))
        .setDisplayName("rescue")
    );
    this.addExtension(new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(0.5)); // 50% chance to drop item
    this.addExtension(new Updatable(this, this.updateSurvivor.bind(this)));
    // Don't add Groupable extension until rescued - prevents zombies from targeting unrescued survivors
  }

  private updateSurvivor(deltaTime: number): void {
    // Don't update if dead (only check if Destructible extension exists, i.e., if rescued)
    if (this.hasExt(Destructible) && this.getExt(Destructible).isDead()) {
      return;
    }

    // Initialize initial spawn position on first update
    if (this.initialSpawnPosition === null) {
      this.initialSpawnPosition = this.getExt(Positionable).getCenterPosition().clone();
    }

    // Update shooting cooldown
    this.fireCooldown.update(deltaTime);

    // Always wander - use different center based on rescue status
    if (this.isRescued) {
      this.updateWanderingAtCampsite(deltaTime);
    } else {
      this.updateWanderingAtSpawn(deltaTime);
    }
    this.handleMovement(deltaTime);

    // Try to shoot at zombies (only when rescued)
    if (this.isRescued && this.fireCooldown.isReady()) {
      this.tryShootAtZombie();
    }
  }

  private updateWanderingAtCampsite(deltaTime: number): void {
    // Initialize campsite center if not set
    if (!this.campsiteCenter) {
      const campsitePos = this.getGameManagers().getMapManager().getRandomCampsitePosition();
      if (campsitePos) {
        // Use campsite center (approximate center of biome)
        const centerBiomeX = Math.floor(MAP_SIZE / 2); // MAP_SIZE / 2
        const centerBiomeY = Math.floor(MAP_SIZE / 2);
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        this.campsiteCenter = new Vector2(
          (centerBiomeX * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE,
          (centerBiomeY * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE
        );
      } else {
        // Fallback: use current position as center
        this.campsiteCenter = this.getExt(Positionable).getCenterPosition();
      }
    }

    this.updateWandering(deltaTime, this.campsiteCenter);
  }

  private updateWanderingAtSpawn(deltaTime: number): void {
    // Use initial spawn position as wander center
    if (this.initialSpawnPosition === null) {
      // Fallback: use current position if spawn position not set
      this.initialSpawnPosition = this.getExt(Positionable).getCenterPosition().clone();
    }

    this.updateWandering(deltaTime, this.initialSpawnPosition);
  }

  private updateWandering(deltaTime: number, wanderCenter: Vector2): void {
    const movable = this.getExt(Movable);
    const currentPos = this.getExt(Positionable).getCenterPosition();
    const distanceFromCenter = distance(currentPos, wanderCenter);

    // Check if we're outside the wander radius
    if (distanceFromCenter > SURVIVOR_WANDER_RADIUS) {
      // Move back towards center
      const direction = normalizeVector(
        new Vector2(wanderCenter.x - currentPos.x, wanderCenter.y - currentPos.y)
      );
      movable.setVelocity(
        new Vector2(direction.x * SURVIVOR_WANDER_SPEED, direction.y * SURVIVOR_WANDER_SPEED)
      );
      this.isWandering = true;
      this.wanderTimer = WANDER_MOVE_DURATION;
      return;
    }

    // Update wander timer
    this.wanderTimer += deltaTime;

    if (this.isWandering) {
      // Currently moving
      if (this.wanderTimer >= WANDER_MOVE_DURATION) {
        // Switch to pause
        this.isWandering = false;
        this.wanderTimer = 0;
        movable.setVelocity(new Vector2(0, 0));
      } else if (this.wanderDirection) {
        // Continue moving in current direction
        movable.setVelocity(
          new Vector2(
            this.wanderDirection.x * SURVIVOR_WANDER_SPEED,
            this.wanderDirection.y * SURVIVOR_WANDER_SPEED
          )
        );
      }
    } else {
      // Currently paused
      if (this.wanderTimer >= WANDER_PAUSE_DURATION) {
        // Switch to moving - pick new random direction
        this.isWandering = true;
        this.wanderTimer = 0;

        // Pick random direction
        const angle = Math.random() * Math.PI * 2;
        this.wanderDirection = normalizeVector(new Vector2(Math.cos(angle), Math.sin(angle)));

        // Ensure direction keeps us within bounds
        const testPos = new Vector2(
          currentPos.x + this.wanderDirection.x * SURVIVOR_WANDER_SPEED * WANDER_MOVE_DURATION,
          currentPos.y + this.wanderDirection.y * SURVIVOR_WANDER_SPEED * WANDER_MOVE_DURATION
        );
        const testDistance = distance(testPos, wanderCenter);

        // If new position would be outside bounds, reverse direction
        if (testDistance > SURVIVOR_WANDER_RADIUS) {
          this.wanderDirection = normalizeVector(
            new Vector2(wanderCenter.x - currentPos.x, wanderCenter.y - currentPos.y)
          );
        }

        movable.setVelocity(
          new Vector2(
            this.wanderDirection.x * SURVIVOR_WANDER_SPEED,
            this.wanderDirection.y * SURVIVOR_WANDER_SPEED
          )
        );
      } else {
        // Stay paused
        movable.setVelocity(new Vector2(0, 0));
      }
    }
  }

  private handleMovement(deltaTime: number): void {
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    if (velocity.x === 0 && velocity.y === 0) {
      return;
    }

    const positionable = this.getExt(Positionable);
    const originalPosition = positionable.getPosition();

    if (velocity.x !== 0) {
      const attemptedPosition = new Vector2(
        originalPosition.x + velocity.x * deltaTime,
        originalPosition.y
      );
      positionable.setPosition(attemptedPosition);

      if (this.getEntityManager().isColliding(this)) {
        positionable.setPosition(originalPosition);
      }
    }

    const afterXPosition = positionable.getPosition();

    if (velocity.y !== 0) {
      const attemptedPosition = new Vector2(
        afterXPosition.x,
        afterXPosition.y + velocity.y * deltaTime
      );
      positionable.setPosition(attemptedPosition);

      if (this.getEntityManager().isColliding(this)) {
        positionable.setPosition(afterXPosition);
      }
    }
  }

  private tryShootAtZombie(): void {
    const position = this.getExt(Positionable).getCenterPosition();

    // Find closest zombie within range
    // Use filterSet to only query zombies from spatial grid (more efficient)
    const zombieFilterSet = new Set(Zombies);
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      SURVIVOR_SHOOT_RANGE,
      zombieFilterSet
    );

    // getNearbyEntities already filtered by distance, so we just need to find closest alive zombie
    let closestZombie: Entity | null = null;
    let closestDistanceSquared = Infinity;

    for (const entity of nearbyEntities) {
      // Check if zombie has destructible (is alive)
      if (!entity.hasExt(Destructible)) continue;
      if (entity.getExt(Destructible).isDead()) continue;

      // Calculate squared distance (faster than distance calculation)
      const zombiePos = entity.getExt(Positionable).getCenterPosition();
      const dx = position.x - zombiePos.x;
      const dy = position.y - zombiePos.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared < closestDistanceSquared) {
        closestDistanceSquared = distSquared;
        closestZombie = entity;
      }
    }

    // Shoot at closest zombie
    if (closestZombie) {
      this.shootAt(closestZombie);
      this.fireCooldown.reset();
    }
  }

  private shootAt(target: Entity): void {
    const survivorPosition = this.getExt(Positionable).getCenterPosition();
    const targetPosition = target.getExt(Positionable).getCenterPosition();

    // Calculate direction to target
    const direction = new Vector2(
      targetPosition.x - survivorPosition.x,
      targetPosition.y - survivorPosition.y
    );

    // Create and fire bullet
    const bullet = new Bullet(this.getGameManagers(), SURVIVOR_SHOOT_DAMAGE);
    bullet.setPosition(survivorPosition);
    bullet.setDirectionFromVelocity(direction);
    bullet.setShooterId(this.getId());
    this.getEntityManager().addEntity(bullet);

    this.getGameManagers()
      .getBroadcaster()
      .broadcastEvent(new GunFiredEvent(this.getId(), WEAPON_TYPES.PISTOL as WeaponKey));
  }

  private onRescue(entityId: string): void {
    // Only allow rescue if not already rescued
    if (this.isRescued) {
      return;
    }

    // Teleport to campsite
    const campsitePos = this.getGameManagers().getMapManager().getRandomCampsitePosition();

    if (campsitePos) {
      this.getExt(Positionable).setPosition(campsitePos);
      this.isRescued = true;
      this.markFieldDirty("isRescued");

      // Add Destructible extension now that survivor is rescued (can take damage)
      this.addExtension(
        new Destructible(this)
          .setMaxHealth(SURVIVOR_MAX_HEALTH)
          .setHealth(SURVIVOR_MAX_HEALTH)
          .onDeath(() => this.onDeath())
      );

      // Add Groupable extension with "friendly" group so zombies can target rescued survivors
      this.addExtension(new Groupable(this, "friendly"));

      // Remove interactive extension (no longer interactable)
      if (this.hasExt(Interactive)) {
        const interactive = this.getExt(Interactive);
        this.removeExtension(interactive);
      }

      // Initialize wandering
      this.wanderTimer = 0;
      this.isWandering = false;
    }
  }

  private onDeath(): void {
    // Stop all movement and AI
    this.getExt(Movable).setVelocity(new Vector2(0, 0));

    // Add interactive extension for looting
    this.addExtension(
      new Interactive(this).onInteract(() => this.onLooted()).setDisplayName("loot")
    );

    // Disable collision
    this.getExt(Collidable).setEnabled(false);
  }

  private onLooted(): void {
    const inventory = this.getExt(Inventory);
    if (inventory) {
      inventory.scatterItems(this.getExt(Positionable).getPosition());
    }

    this.getEntityManager().markEntityForRemoval(this);
    this.getGameManagers().getBroadcaster().broadcastEvent(new LootEvent(this.getId()));
  }

  public getIsRescued(): boolean {
    return this.isRescued;
  }
}
