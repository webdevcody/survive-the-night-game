import { PlayerDroppedItemEvent } from "../../../../game-shared/src/events/server-sent/events/player-dropped-item-event";
import { PlayerHurtEvent } from "../../../../game-shared/src/events/server-sent/events/player-hurt-event";
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
import { Entity } from "@/entities/entity";
import { Input } from "@shared/util/input";
import { InventoryItem, ItemType } from "@shared/util/inventory";
import { normalizeVector, distance } from "@shared/util/physics";
import { RecipeType } from "@shared/util/recipes";
import { Cooldown } from "@/entities/util/cooldown";
import { weaponHandlerRegistry } from "@/entities/weapons/weapon-handler-registry";
import { PlayerDeathEvent } from "../../../../game-shared/src/events/server-sent/events/player-death-event";
import { CraftEvent } from "../../../../game-shared/src/events/server-sent/events/craft-event";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Rectangle } from "@/util/shape";
import Carryable from "@/extensions/carryable";
import { SkinType, SKIN_TYPES } from "@shared/commands/commands";
import { itemRegistry } from "@shared/entities";
import { Blood } from "@/entities/effects/blood";
import { SerializableFields } from "@/util/serializable-fields";
import { Direction } from "@/util/direction";
import { Weapon } from "../weapons/weapon";
import InfiniteRun from "@/extensions/infinite-run";

export class Player extends Entity {
  private static readonly PLAYER_WIDTH = 16;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly PICKUP_HOLD_DURATION = 0.5; // 1 second in seconds
  private static readonly RESPAWN_COOLDOWN_MS = 5000; // 5 seconds

  // Internal state
  private fireCooldown = new Cooldown(0.4, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
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
        deathTime: 0, // Timestamp when player died, 0 means not dead
        // Input fields stored individually for efficient serialization
        inputFacing: Direction.Right,
        inputDx: 0,
        inputDy: 0,
        inputFire: false,
        inputInventoryItem: 1, // Still tracked for consume/drop when itemType is null
        inputSprint: false,
        inputAimAngle: NaN, // NaN represents undefined for optional field
      },
      () => this.markEntityDirty(),
      {
        // Define serialization metadata for number fields
        ping: { numberType: "uint16" },
        inputFacing: { numberType: "uint8" },
        inputInventoryItem: { numberType: "uint8" },
        inputAimAngle: { numberType: "float64", optional: true },
        deathTime: { numberType: "float64" },
        // Note: inputSequenceNumber is not in SerializableFields, so no metadata needed
      }
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
          count: 8,
        },
      },
    ].forEach((item) => inventory.addItem(item));
  }

  get activeItem(): InventoryItem | null {
    return this.getExt(Inventory).getActiveItem(this.serialized.get("inputInventoryItem"));
  }

  setIsCrafting(isCrafting: boolean): void {
    this.serialized.set("isCrafting", isCrafting);
  }

  getIsCrafting(): boolean {
    return this.serialized.get("isCrafting");
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
    // Don't drop inventory items on death
    // this.getExt(Inventory).scatterItems(this.getPosition());
    this.serialized.set("deathTime", Date.now());
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

    // Check respawn cooldown
    const deathTime = this.serialized.get("deathTime");
    if (deathTime > 0) {
      const timeSinceDeath = Date.now() - deathTime;
      if (timeSinceDeath < Player.RESPAWN_COOLDOWN_MS) {
        return; // Still in cooldown
      }
    }

    // Clear death time
    this.serialized.set("deathTime", 0);

    // Don't clear inventory - keep items on respawn
    // this.getExt(Inventory).clear();

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

  getRespawnCooldownRemaining(): number {
    const deathTime = this.serialized.get("deathTime");
    if (deathTime === 0) return 0;
    const timeSinceDeath = Date.now() - deathTime;
    const remaining = Player.RESPAWN_COOLDOWN_MS - timeSinceDeath;
    return Math.max(0, remaining);
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

    if (!this.serialized.get("inputFire")) return;

    // Check if active item is a consumable (like energy drink or bandage)
    const activeItem = this.activeItem;
    if (activeItem) {
      const activeItemEntity = this.getEntityManager().createEntityFromItem(activeItem);
      if (activeItemEntity && activeItemEntity.hasExt(Consumable)) {
        const itemIndex = this.serialized.get("inputInventoryItem") - 1;
        // Add a small cooldown to prevent rapid consumption
        if (this.fireCooldown === null || this.fireCooldown.isReady()) {
          this.fireCooldown = new Cooldown(0.5, true);
          this.fireCooldown.reset();
        } else {
          // Still on cooldown, don't consume yet
          activeItemEntity.clearDirtyFlags();
          return;
        }
        // Consume the item (handles energy drink, bandage, and other consumables)
        activeItemEntity.getExt(Consumable).consume(this.getId(), itemIndex);
        activeItemEntity.clearDirtyFlags();
        return;
      }
      // If it's not a consumable, clear the entity and continue to weapon handling
      if (activeItemEntity) {
        activeItemEntity.clearDirtyFlags();
      }
    }

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
        const inventoryIndex = this.serialized.get("inputInventoryItem") - 1;
        customHandler.handler(
          weaponEntity,
          this.getId(),
          this.getCenterPosition().clone(),
          this.serialized.get("inputFacing"),
          this.serialized.get("inputAimAngle"),
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
        this.serialized.get("inputFacing"),
        this.serialized.get("inputAimAngle")
      );
      weaponEntity.clearDirtyFlags();
    }
  }

  handleMovement(deltaTime: number) {
    const movable = this.getExt(Movable);
    const currentVelocity = movable.getVelocity();

    // Only set velocity from input if we're not being knocked back
    // (knockback velocity will be much higher than normal movement speed)
    const currentSpeed = Math.sqrt(
      currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y
    );
    if (currentSpeed < getConfig().player.PLAYER_SPEED * 2) {
      // Set velocity based on current input
      const poolManager = PoolManager.getInstance();
      const inputDx = this.serialized.get("inputDx");
      const inputDy = this.serialized.get("inputDy");
      if (inputDx === 0 && inputDy === 0) {
        movable.setVelocity(poolManager.vector2.claim(0, 0));
      } else {
        const inputVec = poolManager.vector2.claim(inputDx, inputDy);
        const normalized = normalizeVector(inputVec);

        // Check if infinite run extension is active
        const hasInfiniteRun = this.hasExt(InfiniteRun);

        // Can only sprint if: has stamina AND not exhausted (or infinite run is active)
        const stamina = this.serialized.get("stamina");
        const canSprint =
          this.serialized.get("inputSprint") &&
          (hasInfiniteRun || (stamina > 0 && this.exhaustionTimer <= 0));
        const speedMultiplier = canSprint ? getConfig().player.SPRINT_MULTIPLIER : 1;

        // Drain stamina while sprinting (unless infinite run is active)
        if (canSprint && !hasInfiniteRun) {
          const newStamina = stamina - getConfig().player.STAMINA_DRAIN_RATE * deltaTime;
          this.serialized.set("stamina", Math.max(0, newStamina));
          // maxStamina doesn't change, but mark it dirty for consistency if needed
          const maxStamina = this.serialized.get("maxStamina");
          this.serialized.set("maxStamina", maxStamina);

          // If stamina just hit zero, start exhaustion timer
          if (newStamina <= 0) {
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

    if (
      this.getEntityManager().isColliding(this, [
        Entities.PLAYER,
        Entities.WALL,
        Entities.SENTRY_GUN,
      ])
    ) {
      position.x = previousX;
      this.setPosition(position);
    }

    position.y += velocity.y * deltaTime;
    this.setPosition(position);

    if (
      this.getEntityManager().isColliding(this, [
        Entities.PLAYER,
        Entities.WALL,
        Entities.SENTRY_GUN,
      ])
    ) {
      position.y = previousY;
      this.setPosition(position);
    }
  }

  setDisplayName(displayName: string): void {
    this.serialized.set("displayName", displayName);
  }

  getDisplayName(): string {
    return this.serialized.get("displayName");
  }

  handleStamina(deltaTime: number) {
    // Update exhaustion timer
    if (this.exhaustionTimer > 0) {
      this.exhaustionTimer = Math.max(0, this.exhaustionTimer - deltaTime);
    }

    // Only regenerate stamina when not exhausted
    const stamina = this.serialized.get("stamina");
    const hasInfiniteRun = this.hasExt(InfiniteRun);
    if (this.exhaustionTimer <= 0 && stamina < getConfig().player.MAX_STAMINA) {
      const inputDx = this.serialized.get("inputDx");
      const inputDy = this.serialized.get("inputDy");
      const isMoving = inputDx !== 0 || inputDy !== 0;
      const isSprinting = this.serialized.get("inputSprint") && isMoving && (hasInfiniteRun || stamina > 0);

      // Regenerate stamina when not sprinting
      if (!isSprinting) {
        const oldStamina = stamina;
        const newStamina = Math.min(
          getConfig().player.MAX_STAMINA,
          stamina + getConfig().player.STAMINA_REGEN_RATE * deltaTime
        );
        this.serialized.set("stamina", newStamina);

        // Mark maxStamina dirty if stamina changed (for consistency)
        if (Math.abs(oldStamina - newStamina) > 0.01) {
          const maxStamina = this.serialized.get("maxStamina");
          this.serialized.set("maxStamina", maxStamina);
        }
      }
    }
  }

  private updatePlayer(deltaTime: number) {
    if (this.serialized.get("isCrafting")) {
      return;
    }

    if (this.isDead()) {
      return;
    }

    this.handleAttack(deltaTime);
    this.handleMovement(deltaTime);
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
    // Map input object to individual serialized fields
    this.serialized.set("inputFacing", input.facing ?? Direction.Right);
    this.serialized.set("inputDx", input.dx ?? 0);
    this.serialized.set("inputDy", input.dy ?? 0);
    this.serialized.set("inputFire", input.fire ?? false);
    this.serialized.set("inputSprint", input.sprint ?? false);
    this.serialized.set("inputAimAngle", input.aimAngle ?? NaN); // NaN represents undefined
  }

  selectInventoryItem(index: number) {
    const previousSlot = this.serialized.get("inputInventoryItem");
    this.serialized.set("inputInventoryItem", index);

    // Mark inventory extension as dirty when inventory slot changes
    // This ensures other clients receive inventory data to render the active item
    if (previousSlot !== index) {
      const inventory = this.getExt(Inventory);
      this.markExtensionDirty(inventory);
    }
  }

  setAsFiring(firing: boolean) {
    this.serialized.set("inputFire", firing);
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
    this.serialized.set("skin", skin);
  }

  getSkin(): SkinType {
    return this.serialized.get("skin");
  }

  incrementKills() {
    const currentKills = this.serialized.get("kills") || 0;
    this.serialized.set("kills", currentKills + 1);
  }

  getKills(): number {
    return this.serialized.get("kills") || 0;
  }

  setPing(ping: number): void {
    this.serialized.set("ping", ping);
  }

  getPing(): number {
    return this.serialized.get("ping");
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
