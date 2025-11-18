import { PlayerDroppedItemEvent } from "@shared/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@shared/events/server-sent/player-hurt-event";
import { ResourceType } from "@shared/util/inventory";
import Collidable from "@/extensions/collidable";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Illuminated from "@/extensions/illuminated";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import ResourcesBag from "@/extensions/resources-bag";
import Placeable from "@/extensions/placeable";
import { Broadcaster, IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Direction } from "../../../game-shared/src/util/direction";
import { Entity } from "@/entities/entity";
import { Input } from "../../../game-shared/src/util/input";
import { InventoryItem, ItemType } from "../../../game-shared/src/util/inventory";
import { normalizeVector, distance } from "../../../game-shared/src/util/physics";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { Cooldown } from "@/entities/util/cooldown";
import { Weapon } from "@/entities/weapons/weapon";
import { weaponHandlerRegistry } from "@/entities/weapons/weapon-handler-registry";
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { CraftEvent } from "@shared/events/server-sent/craft-event";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Rectangle } from "@/util/shape";
import Carryable from "@/extensions/carryable";
import { SkinType, SKIN_TYPES } from "@shared/commands/commands";
import { itemRegistry } from "@shared/entities";
import { Blood } from "@/entities/blood";
import { SerializableFields } from "@/util/serializable-fields";

export class Player extends Entity {
  private static readonly PLAYER_WIDTH = 16;
  private static readonly DROP_COOLDOWN = 0.25;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly CONSUME_COOLDOWN = 0.5;
  private static readonly PICKUP_HOLD_DURATION = 0.5; // 1 second in seconds

  // Internal state
  private fireCooldown = new Cooldown(0.4, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN, true);
  private broadcaster: Broadcaster;
  private lastWeaponType: ItemType | null = null;
  private exhaustionTimer: number = 0; // Time remaining before stamina can regenerate
  // Item pickup hold tracking
  private pickupHoldTimer: number = 0; // Time F has been held for pickup
  private targetPickupEntity: number | null = null; // Entity ID being targeted for pickup

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.PLAYER);
    this.broadcaster = gameManagers.getBroadcaster();

    // Initialize serializable fields with default values
    // Input fields are stored individually for efficient serialization
    this.serialized = new SerializableFields(
      {
        isCrafting: false,
        skin: SKIN_TYPES.DEFAULT,
        kills: 0,
        ping: 0,
        displayName: "",
        stamina: getConfig().player.MAX_STAMINA,
        maxStamina: getConfig().player.MAX_STAMINA,
        // Input fields stored individually for efficient serialization
        inputFacing: Direction.Right,
        inputDx: 0,
        inputDy: 0,
        inputInteract: false,
        inputFire: false,
        inputInventoryItem: 1,
        inputDrop: false,
        inputConsume: false,
        inputConsumeItemType: null as string | null,
        inputSprint: false,
        inputAimAngle: NaN, // NaN represents undefined for optional field
        pickupProgress: 0,
      },
      () => this.markEntityDirty()
    );

    this.addExtension(new Inventory(this, gameManagers.getBroadcaster()));
    const poolManager = PoolManager.getInstance();
    this.addExtension(new ResourcesBag(this, gameManagers.getBroadcaster()));
    const collidableSize = poolManager.vector2.claim(
      Player.PLAYER_WIDTH - 8,
      Player.PLAYER_WIDTH - 8
    );
    const collidableOffset = poolManager.vector2.claim(4, 4);
    this.addExtension(new Collidable(this).setSize(collidableSize).setOffset(collidableOffset));
    const positionableSize = poolManager.vector2.claim(Player.PLAYER_WIDTH, Player.PLAYER_WIDTH);
    this.addExtension(new Positionable(this).setSize(positionableSize));
    this.addExtension(
      new Destructible(this)
        .setHealth(getConfig().player.MAX_PLAYER_HEALTH)
        .setMaxHealth(getConfig().player.MAX_PLAYER_HEALTH)
        .onDamaged(() => {
          // Broadcast PlayerHurtEvent when player takes damage (e.g., from zombie attacks)
          this.broadcaster.broadcastEvent(new PlayerHurtEvent(this.getId()));
        })
        .onDeath(() => this.onDeath())
    );
    this.addExtension(new Updatable(this, this.updatePlayer.bind(this)));
    this.addExtension(new Movable(this));
    this.addExtension(new Illuminated(this, 200));
    this.addExtension(new Groupable(this, "friendly"));

    const inventory = this.getExt(Inventory);

    [
      { itemType: "torch" as const },
      { itemType: "knife" as const },
      { itemType: "pistol" as const },
      {
        itemType: "pistol_ammo" as const,
        state: {
          count: 18,
        },
      },
    ].forEach((item) => inventory.addItem(item));
  }

  private setPickupProgress(progress: number): void {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const serialized = this.serialized as any;
    if (serialized.pickupProgress === clampedProgress) {
      return;
    }
    serialized.pickupProgress = clampedProgress;
  }

  get activeItem(): InventoryItem | null {
    const serialized = this.serialized as any;
    return this.getExt(Inventory).getActiveItem(serialized.inputInventoryItem);
  }

  setIsCrafting(isCrafting: boolean): void {
    const serialized = this.serialized as any;
    serialized.isCrafting = isCrafting;
  }

  getIsCrafting(): boolean {
    const serialized = this.serialized as any;
    return serialized.isCrafting;
  }

  isDead(): boolean {
    return this.getExt(Destructible).isDead();
  }

  getHealth(): number {
    return this.getExt(Destructible).getHealth();
  }

  getMaxHealth(): number {
    return this.getExt(Destructible).getMaxHealth();
  }

  getDamageBox(): Rectangle {
    return this.getExt(Destructible).getDamageBox();
  }

  damage(damage: number): void {
    if (this.isDead()) {
      return;
    }

    this.getExt(Destructible).damage(damage);
    this.broadcaster.broadcastEvent(new PlayerHurtEvent(this.getId()));

    // Create blood entity at player position
    const position = this.getExt(Positionable).getPosition();
    const blood = new Blood(this.getGameManagers());
    blood.getExt(Positionable).setPosition(position);
    this.getEntityManager().addEntity(blood);
  }

  onDeath(): void {
    this.setIsCrafting(false);
    this.getExt(Inventory).scatterItems(this.getPosition());
    this.broadcaster.broadcastEvent(
      new PlayerDeathEvent({
        playerId: this.getId(),
        displayName: this.getDisplayName(),
      })
    );
    this.getExt(Collidable).setEnabled(false);
  }

  respawn(): void {
    if (!this.isDead()) return;

    // Clear inventory
    this.getExt(Inventory).clear();

    // Re-enable collision
    this.getExt(Collidable).setEnabled(true);

    // Set health to max
    const maxHealth = this.getExt(Destructible).getMaxHealth();
    this.getExt(Destructible).setHealth(maxHealth);

    // Respawn at campsite
    const campsitePosition = this.getGameManagers().getMapManager().getRandomCampsitePosition();
    if (campsitePosition) {
      this.setPosition(campsitePosition);
    }
  }

  isInventoryFull(): boolean {
    return this.getExt(Inventory).isFull();
  }

  hasInInventory(key: ItemType): boolean {
    return this.getExt(Inventory).hasItem(key);
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getCenterPosition();
  }

  getHitbox(): Rectangle {
    const collidable = this.getExt(Collidable);
    const hitbox = collidable.getHitBox();
    return hitbox;
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getPosition();
  }

  getInventory(): InventoryItem[] {
    return this.getExt(Inventory).getItems();
  }

  clearInventory(): void {
    this.getExt(Inventory).clear();
  }

  getActiveWeapon(): InventoryItem | null {
    return this.getExt(Inventory).getActiveWeapon(this.activeItem);
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
  }

  craftRecipe(recipe: RecipeType): void {
    const resourcesBag = this.getExt(ResourcesBag);
    const resources = resourcesBag.getAllResources();
    const inventory = this.getExt(Inventory);
    const originalInventoryJson = JSON.stringify(inventory.getItems());
    const result = inventory.craftRecipe(recipe, resources);

    // Check if crafting succeeded (inventory changed or item was dropped)
    const inventoryChanged = JSON.stringify(inventory.getItems()) !== originalInventoryJson;
    const craftingSucceeded = inventoryChanged || result.itemToDrop !== undefined;

    // Update player's resource counts using generic setResource
    resourcesBag.setResource("wood", result.resources.wood);
    resourcesBag.setResource("cloth", result.resources.cloth);

    // If inventory was full, drop the crafted item on the ground
    if (result.itemToDrop) {
      const entity = this.getEntityManager()?.createEntityFromItem(result.itemToDrop);
      if (entity) {
        const position = this.getExt(Positionable).getPosition();
        // Add small random offset so it doesn't spawn exactly on the player
        const offset = 20;
        const theta = Math.random() * 2 * Math.PI;
        const poolManager = PoolManager.getInstance();
        const pos = poolManager.vector2.claim(
          position.x + offset * Math.cos(theta),
          position.y + offset * Math.sin(theta)
        );

        if ("setPosition" in entity) {
          (entity as any).setPosition(pos);
        } else if (entity.hasExt(Positionable)) {
          entity.getExt(Positionable).setPosition(pos);
        }

        this.getEntityManager()?.addEntity(entity);
      }
    }

    // Broadcast craft event if crafting succeeded
    if (craftingSucceeded) {
      this.getGameManagers().getBroadcaster().broadcastEvent(new CraftEvent(this.getId()));
    }

    this.setIsCrafting(false);
  }

  handleAttack(deltaTime: number) {
    this.fireCooldown.update(deltaTime);
    const serialized = this.serialized as any;

    if (!serialized.inputFire) return;

    const activeWeapon = this.getActiveWeapon();
    if (activeWeapon === null) return;

    // TODO: clean this up, this feels bad and unperformant
    const weaponEntity = this.getEntityManager().createEntityFromItem(activeWeapon);
    if (!weaponEntity) {
      console.log("createEntityFromItem returned null for", activeWeapon.itemType);
      return;
    }
    // Ensure temporary weapon entity doesn't get tracked for networking
    weaponEntity.clearDirtyFlags();

    const weaponType = activeWeapon.itemType;

    // Check if there's a custom handler registered for this weapon type
    // (for weapons that can't extend Weapon class)
    const customHandler = weaponHandlerRegistry.get(weaponType);
    if (customHandler) {
      // Use custom handler for special cases
      if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
        this.fireCooldown = new Cooldown(customHandler.cooldown, true);
        this.lastWeaponType = weaponType;
      }

      if (this.fireCooldown.isReady()) {
        this.fireCooldown.reset();
        const inventoryIndex = serialized.inputInventoryItem - 1;
        customHandler.handler(
          weaponEntity,
          this.getId(),
          this.getCenterPosition().clone(),
          serialized.inputFacing,
          serialized.inputAimAngle,
          inventoryIndex
        );
        weaponEntity.clearDirtyFlags();
      }
      return;
    }

    // Handle weapons that extend Weapon class (including grenades now)
    if (!(weaponEntity instanceof Weapon)) {
      return;
    }

    if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
      this.fireCooldown = new Cooldown(weaponEntity.getCooldown(), true);
      this.lastWeaponType = weaponType;
    }

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();
      // Use aimAngle if provided (mouse aiming), otherwise fall back to facing direction
      weaponEntity.attack(
        this.getId(),
        this.getCenterPosition().clone(),
        serialized.inputFacing,
        serialized.inputAimAngle
      );
      weaponEntity.clearDirtyFlags();
    }
  }

  handleMovement(deltaTime: number) {
    const movable = this.getExt(Movable);
    const currentVelocity = movable.getVelocity();
    const serialized = this.serialized as any;

    // Only set velocity from input if we're not being knocked back
    // (knockback velocity will be much higher than normal movement speed)
    const currentSpeed = Math.sqrt(
      currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y
    );
    if (currentSpeed < getConfig().player.PLAYER_SPEED * 2) {
      // Set velocity based on current input
      const poolManager = PoolManager.getInstance();
      if (serialized.inputDx === 0 && serialized.inputDy === 0) {
        movable.setVelocity(poolManager.vector2.claim(0, 0));
      } else {
        const inputVec = poolManager.vector2.claim(serialized.inputDx, serialized.inputDy);
        const normalized = normalizeVector(inputVec);

        // Can only sprint if: has stamina AND not exhausted
        const canSprint =
          serialized.inputSprint && serialized.stamina > 0 && this.exhaustionTimer <= 0;
        const speedMultiplier = canSprint ? getConfig().player.SPRINT_MULTIPLIER : 1;

        // Drain stamina while sprinting
        if (canSprint) {
          const newStamina = serialized.stamina - getConfig().player.STAMINA_DRAIN_RATE * deltaTime;
          serialized.stamina = Math.max(0, newStamina);
          // maxStamina doesn't change, but mark it dirty for consistency if needed
          serialized.maxStamina = serialized.maxStamina;

          // If stamina just hit zero, start exhaustion timer
          if (serialized.stamina === 0) {
            this.exhaustionTimer = getConfig().player.EXHAUSTION_DURATION;
          }
        }

        movable.setVelocity(
          poolManager.vector2.claim(
            normalized.x * getConfig().player.PLAYER_SPEED * speedMultiplier,
            normalized.y * getConfig().player.PLAYER_SPEED * speedMultiplier
          )
        );
      }
    }

    // Handle position updates and collisions
    const position = this.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    const velocity = movable.getVelocity();

    position.x += velocity.x * deltaTime;
    this.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.x = previousX;
      this.setPosition(position);
    }

    position.y += velocity.y * deltaTime;
    this.setPosition(position);

    if (this.getEntityManager().isColliding(this, [Entities.PLAYER])) {
      position.y = previousY;
      this.setPosition(position);
    }
  }

  setDisplayName(displayName: string): void {
    const serialized = this.serialized as any;
    serialized.displayName = displayName;
  }

  getDisplayName(): string {
    const serialized = this.serialized as any;
    return serialized.displayName;
  }

  handleInteract(deltaTime: number) {
    this.interactCooldown.update(deltaTime);
    const serialized = this.serialized as any;

    if (!serialized.inputInteract) {
      this.pickupHoldTimer = 0;
      this.targetPickupEntity = null;
      this.setPickupProgress(0);
      return;
    }

    // Cache position and radius once
    const playerPos = this.getCenterPosition();
    const maxRadius = getConfig().player.MAX_INTERACT_RADIUS;

    // Get nearby entities (already filtered by distance in getNearbyEntities)
    const entities = this.getEntityManager()
      .getNearbyEntities(playerPos, maxRadius)
      .filter((entity) => entity.hasExt(Interactive));

    if (entities.length === 0) {
      this.setPickupProgress(0);
      this.pickupHoldTimer = 0;
      this.targetPickupEntity = null;
      return;
    }

    // Pre-calculate distances and dead player flags to avoid repeated calculations
    const entityData = entities.map((entity) => {
      const entityPos = entity.getExt(Positionable).getCenterPosition();
      return {
        entity,
        distance: distance(playerPos, entityPos),
        isDeadPlayer: entity.getType() === Entities.PLAYER && (entity as Player).isDead(),
        isPlaceable: entity.hasExt(Placeable),
      };
    });

    // Sort by priority (dead players first) then by distance
    entityData.sort((a, b) => {
      // Dead players should come first
      if (a.isDeadPlayer && !b.isDeadPlayer) return -1;
      if (!a.isDeadPlayer && b.isDeadPlayer) return 1;
      // If both are dead players or both are not, sort by distance
      return a.distance - b.distance;
    });

    // Get the closest entity (already filtered and sorted)
    const closestEntity = entityData[0];

    const now = new Date().getTime();
    if (this.pickupHoldTimer == 0) {
      this.pickupHoldTimer = now;
    }
    let timeSincePickup = now - this.pickupHoldTimer;
    this.targetPickupEntity = closestEntity.entity.getId();

    if (closestEntity.isPlaceable) {
      // Calculate progress (0-1) based on hold duration - update every frame
      const holdDurationMs = Player.PICKUP_HOLD_DURATION * 1000; // Convert seconds to milliseconds
      this.setPickupProgress(timeSincePickup / holdDurationMs);

      // Check for pickup completion every frame (not just when cooldown is ready)
      if (timeSincePickup >= holdDurationMs) {
        closestEntity.entity.getExt(Interactive).interact(this.getId());
        this.pickupHoldTimer = 0;
        this.targetPickupEntity = null;
        this.setPickupProgress(0);
      }
    } else {
      this.setPickupProgress(0);
      // For non-placeable items, respect the cooldown (instant interactions)
      if (this.interactCooldown.isReady()) {
        this.interactCooldown.reset();
        closestEntity.entity.getExt(Interactive).interact(this.getId());
        this.pickupHoldTimer = 0;
        this.targetPickupEntity = null;
        this.setPickupProgress(0);
      }
    }
  }

  handleDrop(deltaTime: number) {
    this.dropCooldown.update(deltaTime);
    const serialized = this.serialized as any;

    if (!serialized.inputDrop) return;

    if (this.dropCooldown.isReady() && serialized.inputInventoryItem !== null) {
      this.dropCooldown.reset();
      const itemIndex = serialized.inputInventoryItem - 1;
      const inventory = this.getExt(Inventory);
      const currentItem = inventory.getItems()[itemIndex];

      if (!currentItem) return;

      // For other items, drop the entire stack
      const item = inventory.removeItem(itemIndex);

      if (item) {
        const entity = this.getEntityManager().createEntityFromItem(item);

        if (!entity) return;

        const carryable = entity.getExt(Carryable);
        carryable.setItemState({
          count: item.state?.count || 0,
        });

        const offset = 16;
        let dx = 0;
        let dy = 0;

        if (serialized.inputFacing === Direction.Up) {
          dy = -offset;
        } else if (serialized.inputFacing === Direction.Down) {
          dy = offset;
        } else if (serialized.inputFacing === Direction.Left) {
          dx = -offset;
        } else if (serialized.inputFacing === Direction.Right) {
          dx = offset;
        }

        const poolManager = PoolManager.getInstance();
        const pos = poolManager.vector2.claim(this.getPosition().x + dx, this.getPosition().y + dy);

        if (entity.hasExt(Positionable)) {
          entity.getExt(Positionable).setPosition(pos);
        }

        this.getEntityManager().addEntity(entity);

        this.broadcaster.broadcastEvent(
          new PlayerDroppedItemEvent({
            playerId: this.getId(),
            itemType: item.itemType,
          })
        );
      }
    }
  }

  handleConsume(deltaTime: number) {
    this.consumeCooldown.update(deltaTime);
    const serialized = this.serialized as any;

    if (!serialized.inputConsume) return;

    if (this.consumeCooldown.isReady()) {
      this.consumeCooldown.reset();

      let itemIndex: number | undefined;
      let item: InventoryItem | null = null;

      // If consumeItemType is specified, find the first item of that type
      if (serialized.inputConsumeItemType !== null) {
        const inventory = this.getExt(Inventory).getItems();
        const foundIndex = inventory.findIndex(
          (invItem) => invItem?.itemType === serialized.inputConsumeItemType
        );

        if (foundIndex !== -1) {
          itemIndex = foundIndex;
          item = inventory[itemIndex];
        }
      } else if (serialized.inputInventoryItem !== null) {
        // Otherwise, use the currently selected inventory slot
        itemIndex = serialized.inputInventoryItem - 1;
        item = this.getExt(Inventory).getItems()[itemIndex];
      }

      if (item && itemIndex !== undefined) {
        const entity = this.getEntityManager().createEntityFromItem(item);
        if (!entity) return;

        if (entity.hasExt(Consumable)) {
          entity.getExt(Consumable).consume(String(this.getId()), itemIndex);
        }
      }
    }
  }

  handleStamina(deltaTime: number) {
    const serialized = this.serialized as any;
    // Update exhaustion timer
    if (this.exhaustionTimer > 0) {
      this.exhaustionTimer = Math.max(0, this.exhaustionTimer - deltaTime);
    }

    // Only regenerate stamina when not exhausted
    if (this.exhaustionTimer <= 0 && serialized.stamina < getConfig().player.MAX_STAMINA) {
      const isMoving = serialized.inputDx !== 0 || serialized.inputDy !== 0;
      const isSprinting = serialized.inputSprint && isMoving && serialized.stamina > 0;

      // Regenerate stamina when not sprinting
      if (!isSprinting) {
        const oldStamina = serialized.stamina;
        serialized.stamina = Math.min(
          getConfig().player.MAX_STAMINA,
          serialized.stamina + getConfig().player.STAMINA_REGEN_RATE * deltaTime
        );

        // Mark maxStamina dirty if stamina changed (for consistency)
        if (Math.abs(oldStamina - serialized.stamina) > 0.01) {
          serialized.maxStamina = serialized.maxStamina;
        }
      }
    }
  }

  private updatePlayer(deltaTime: number) {
    const serialized = this.serialized as any;
    if (serialized.isCrafting) {
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
    this.handleStamina(deltaTime);
    this.updateLighting();
  }

  private updateLighting() {
    if (!this.hasExt(Illuminated)) {
      return;
    }

    const illuminated = this.getExt(Illuminated);
    let totalLightIntensity = 0;

    // Check all inventory items for light intensity
    // Note: activeItem is also in the inventory array, so we only need to check inventory
    const inventory = this.getExt(Inventory);
    const inventoryItems = inventory.getItems();
    for (const item of inventoryItems) {
      if (item) {
        const itemConfig = itemRegistry.get(item.itemType);
        if (itemConfig?.lightIntensity) {
          totalLightIntensity += itemConfig.lightIntensity;
        }
      }
    }

    illuminated.setRadius(totalLightIntensity);
  }

  setInput(input: Input) {
    const serialized = this.serialized as any;
    const previousSlot = serialized.inputInventoryItem;
    // Map input object to individual serialized fields
    serialized.inputFacing = input.facing ?? Direction.Right;
    serialized.inputDx = input.dx ?? 0;
    serialized.inputDy = input.dy ?? 0;
    serialized.inputInteract = input.interact ?? false;
    serialized.inputFire = input.fire ?? false;
    serialized.inputInventoryItem = input.inventoryItem ?? 1;
    serialized.inputDrop = input.drop ?? false;
    serialized.inputConsume = input.consume ?? false;
    serialized.inputConsumeItemType = input.consumeItemType ?? null;
    serialized.inputSprint = input.sprint ?? false;
    serialized.inputAimAngle = input.aimAngle ?? NaN; // NaN represents undefined
  }

  selectInventoryItem(index: number) {
    const serialized = this.serialized as any;
    serialized.inputInventoryItem = index;
  }

  setAsFiring(firing: boolean) {
    const serialized = this.serialized as any;
    serialized.inputFire = firing;
  }

  setAsInteracting(interacting: boolean) {
    const serialized = this.serialized as any;
    serialized.inputInteract = interacting;
  }

  setAsDropping(dropping: boolean) {
    const serialized = this.serialized as any;
    serialized.inputDrop = dropping;
  }

  setUseItem(use: boolean) {
    const serialized = this.serialized as any;
    serialized.inputConsume = use;
  }

  heal(amount: number): void {
    this.getExt(Destructible).heal(amount);
  }

  update(deltaTime: number): void {
    if (this.isDead()) {
      return;
    }
  }

  setSkin(skin: SkinType): void {
    const serialized = this.serialized as any;
    serialized.skin = skin;
  }

  getSkin(): SkinType {
    const serialized = this.serialized as any;
    return serialized.skin;
  }

  incrementKills() {
    const serialized = this.serialized as any;
    serialized.kills = (serialized.kills || 0) + 1;
  }

  getKills(): number {
    const serialized = this.serialized as any;
    return serialized.kills;
  }

  setPing(ping: number): void {
    const serialized = this.serialized as any;
    serialized.ping = ping;
  }

  getPing(): number {
    const serialized = this.serialized as any;
    return serialized.ping;
  }

  addCoins(amount: number): void {
    this.getExt(ResourcesBag).addCoins(amount);
  }

  getCoins(): number {
    return this.getExt(ResourcesBag).getCoins();
  }

  /**
   * Add a resource and broadcast pickup event if amount > 0
   * Works with any resource type defined in RESOURCE_CONFIGS
   */
  addResource(resourceType: ResourceType, amount: number): void {
    this.getExt(ResourcesBag).addResource(resourceType, amount);
  }

  /**
   * Get the amount of a specific resource
   */
  getResource(resourceType: ResourceType): number {
    return this.getExt(ResourcesBag).getResource(resourceType);
  }

  /**
   * Set the amount of a specific resource
   */
  setResource(resourceType: ResourceType, amount: number): void {
    this.getExt(ResourcesBag).setResource(resourceType, amount);
  }

  /**
   * Remove a specific amount of a resource
   */
  removeResource(resourceType: ResourceType, amount: number): void {
    this.getExt(ResourcesBag).removeResource(resourceType, amount);
  }

  // Backward compatibility getters/setters for wood
  getWood(): number {
    return this.getExt(ResourcesBag).getWood();
  }

  setWood(amount: number): void {
    this.getExt(ResourcesBag).setWood(amount);
  }

  removeWood(amount: number): void {
    this.getExt(ResourcesBag).removeWood(amount);
  }

  // Backward compatibility getters/setters for cloth
  getCloth(): number {
    return this.getExt(ResourcesBag).getCloth();
  }

  setCloth(amount: number): void {
    this.getExt(ResourcesBag).setCloth(amount);
  }

  removeCloth(amount: number): void {
    this.getExt(ResourcesBag).removeCloth(amount);
  }

  // Base class already handles isDirty and clearDirtyFlags with the dirty fields set
}
