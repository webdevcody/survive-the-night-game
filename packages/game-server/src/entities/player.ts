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
import { Broadcaster, IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Direction } from "../../../game-shared/src/util/direction";
import { Entity } from "@/entities/entity";
import { Input } from "../../../game-shared/src/util/input";
import { InventoryItem, ItemType } from "../../../game-shared/src/util/inventory";
import { normalizeVector, distance } from "../../../game-shared/src/util/physics";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { RawEntity } from "@shared/types/entity";
import { Cooldown } from "@/entities/util/cooldown";
import { Weapon } from "@/entities/weapons/weapon";
import { weaponHandlerRegistry } from "@/entities/weapons/weapon-handler-registry";
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { CraftEvent } from "@shared/events/server-sent/craft-event";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
import Carryable from "@/extensions/carryable";
import { SkinType, SKIN_TYPES } from "@shared/commands/commands";
import { itemRegistry } from "@shared/entities";

// Define serializable fields for type safety
const PLAYER_SERIALIZABLE_FIELDS = [
  "isCrafting",
  "skin",
  "kills",
  "ping",
  "displayName",
  "stamina",
  "maxStamina",
  "input",
  "activeItem",
  "inventory",
] as const;

export class Player extends Entity<typeof PLAYER_SERIALIZABLE_FIELDS> {
  protected serializableFields = PLAYER_SERIALIZABLE_FIELDS;

  private static readonly PLAYER_WIDTH = 16;
  private static readonly DROP_COOLDOWN = 0.25;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly CONSUME_COOLDOWN = 0.5;

  // Internal state
  private fireCooldown = new Cooldown(0.4, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN, true);
  private broadcaster: Broadcaster;
  private lastWeaponType: ItemType | null = null;
  private exhaustionTimer: number = 0; // Time remaining before stamina can regenerate

  // Serializable fields (base class will access these directly)
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
    consumeItemType: null,
    sprint: false,
  };
  private isCrafting = false;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private kills: number = 0;
  private ping: number = 0;
  private displayName: string = "";
  private stamina: number = getConfig().player.MAX_STAMINA;
  private maxStamina: number = getConfig().player.MAX_STAMINA;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.PLAYER);
    this.broadcaster = gameManagers.getBroadcaster();

    this.addExtension(new Inventory(this, gameManagers.getBroadcaster()));
    this.addExtension(new ResourcesBag(this, gameManagers.getBroadcaster()));
    this.addExtension(
      new Collidable(this)
        .setSize(new Vector2(Player.PLAYER_WIDTH - 8, Player.PLAYER_WIDTH - 8))
        .setOffset(new Vector2(4, 4))
    );
    this.addExtension(
      new Positionable(this).setSize(new Vector2(Player.PLAYER_WIDTH, Player.PLAYER_WIDTH))
    );
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

  get activeItem(): InventoryItem | null {
    return this.getExt(Inventory).getActiveItem(this.input.inventoryItem);
  }

  setIsCrafting(isCrafting: boolean): void {
    this.isCrafting = isCrafting;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
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

  serialize(onlyDirty: boolean = false): RawEntity {
    return super.serialize(onlyDirty);
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
        const pos = new Vector2(
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

    if (!this.input.fire) return;

    const activeWeapon = this.getActiveWeapon();
    if (activeWeapon === null) return;

    // TODO: clean this up, this feels bad and unperformant
    const weaponEntity = this.getEntityManager().createEntityFromItem(activeWeapon);
    if (!weaponEntity) {
      console.log("createEntityFromItem returned null for", activeWeapon.itemType);
      return;
    }

    const weaponType = activeWeapon.itemType;
    console.log(
      "weaponType:",
      weaponType,
      "weaponEntity instanceof Weapon:",
      weaponEntity instanceof Weapon
    );

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
        const inventoryIndex = this.input.inventoryItem - 1;
        customHandler.handler(
          weaponEntity,
          this.getId(),
          this.getCenterPosition(),
          this.input.facing,
          this.input.aimAngle,
          inventoryIndex
        );
      }
      return;
    }

    // Handle weapons that extend Weapon class (including grenades now)
    if (!(weaponEntity instanceof Weapon)) {
      console.log("weaponEntity is not instanceof Weapon, type:", weaponEntity.constructor.name);
      return;
    }

    if (this.fireCooldown === null || this.lastWeaponType !== weaponType) {
      this.fireCooldown = new Cooldown(weaponEntity.getCooldown(), true);
      this.lastWeaponType = weaponType;
    }

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();
      console.log("attacking with", weaponType);
      // Use aimAngle if provided (mouse aiming), otherwise fall back to facing direction
      weaponEntity.attack(
        this.getId(),
        this.getCenterPosition(),
        this.input.facing,
        this.input.aimAngle
      );
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
      if (this.input.dx === 0 && this.input.dy === 0) {
        movable.setVelocity(new Vector2(0, 0));
      } else {
        const normalized = normalizeVector(new Vector2(this.input.dx, this.input.dy));

        // Can only sprint if: has stamina AND not exhausted
        const canSprint = this.input.sprint && this.stamina > 0 && this.exhaustionTimer <= 0;
        const speedMultiplier = canSprint ? getConfig().player.SPRINT_MULTIPLIER : 1;

        // Drain stamina while sprinting
        if (canSprint) {
          const newStamina = this.stamina - getConfig().player.STAMINA_DRAIN_RATE * deltaTime;
          this.stamina = Math.max(0, newStamina);
          // Always mark dirty when draining stamina (even small changes should be synced)
          this.markFieldDirty("stamina");
          this.markFieldDirty("maxStamina");

          // If stamina just hit zero, start exhaustion timer
          if (this.stamina === 0) {
            this.exhaustionTimer = getConfig().player.EXHAUSTION_DURATION;
          }
        }

        movable.setVelocity(
          new Vector2(
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
    this.displayName = displayName;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  handleInteract(deltaTime: number) {
    this.interactCooldown.update(deltaTime);

    if (!this.input.interact) return;

    if (this.interactCooldown.isReady()) {
      this.interactCooldown.reset();

      // Cache position and radius once
      const playerPos = this.getCenterPosition();
      const maxRadius = getConfig().player.MAX_INTERACT_RADIUS;

      // Get nearby entities (already filtered by distance in getNearbyEntities)
      const entities = this.getEntityManager()
        .getNearbyEntities(playerPos, maxRadius)
        .filter((entity) => entity.hasExt(Interactive));

      if (entities.length === 0) return;

      // Pre-calculate distances and dead player flags to avoid repeated calculations
      const entityData = entities.map((entity) => {
        const entityPos = entity.getExt(Positionable).getCenterPosition();
        return {
          entity,
          distance: distance(playerPos, entityPos),
          isDeadPlayer: entity.getType() === Entities.PLAYER && (entity as Player).isDead(),
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
      const closestEntity = entityData[0].entity;
      closestEntity.getExt(Interactive).interact(this.getId());
    }
  }

  handleDrop(deltaTime: number) {
    this.dropCooldown.update(deltaTime);

    if (!this.input.drop) return;

    if (this.dropCooldown.isReady() && this.input.inventoryItem !== null) {
      this.dropCooldown.reset();
      const itemIndex = this.input.inventoryItem - 1;
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

        if (this.input.facing === Direction.Up) {
          dy = -offset;
        } else if (this.input.facing === Direction.Down) {
          dy = offset;
        } else if (this.input.facing === Direction.Left) {
          dx = -offset;
        } else if (this.input.facing === Direction.Right) {
          dx = offset;
        }

        const pos = new Vector2(this.getPosition().x + dx, this.getPosition().y + dy);

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

    if (!this.input.consume) return;

    if (this.consumeCooldown.isReady()) {
      this.consumeCooldown.reset();

      let itemIndex: number;
      let item: InventoryItem | null = null;

      // If consumeItemType is specified, find the first item of that type
      if (this.input.consumeItemType !== null) {
        const inventory = this.getExt(Inventory).getItems();
        const foundIndex = inventory.findIndex(
          (invItem) => invItem?.itemType === this.input.consumeItemType
        );

        if (foundIndex !== -1) {
          itemIndex = foundIndex;
          item = inventory[itemIndex];
        }
      } else if (this.input.inventoryItem !== null) {
        // Otherwise, use the currently selected inventory slot
        itemIndex = this.input.inventoryItem - 1;
        item = this.getExt(Inventory).getItems()[itemIndex];
      }

      if (item) {
        const entity = this.getEntityManager().createEntityFromItem(item);
        if (!entity) return;

        if (entity.hasExt(Consumable)) {
          entity.getExt(Consumable).consume(this.getId(), itemIndex);
        }
      }
    }
  }

  handleStamina(deltaTime: number) {
    // Update exhaustion timer
    if (this.exhaustionTimer > 0) {
      this.exhaustionTimer = Math.max(0, this.exhaustionTimer - deltaTime);
    }

    // Only regenerate stamina when not exhausted
    if (this.exhaustionTimer <= 0 && this.stamina < getConfig().player.MAX_STAMINA) {
      const isMoving = this.input.dx !== 0 || this.input.dy !== 0;
      const isSprinting = this.input.sprint && isMoving && this.stamina > 0;

      // Regenerate stamina when not sprinting
      if (!isSprinting) {
        const oldStamina = this.stamina;
        this.stamina = Math.min(
          getConfig().player.MAX_STAMINA,
          this.stamina + getConfig().player.STAMINA_REGEN_RATE * deltaTime
        );

        // Mark dirty if stamina actually changed (to avoid unnecessary updates when at max)
        if (Math.abs(oldStamina - this.stamina) > 0.01) {
          this.markFieldDirty("stamina");
          this.markFieldDirty("maxStamina");
        }
      }
    }
  }

  private updatePlayer(deltaTime: number) {
    if (this.isCrafting) {
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
    const previousSlot = this.input.inventoryItem;
    this.input = input;
    if (input.inventoryItem !== previousSlot) {
      this.markFieldDirty("input");
    }
  }

  selectInventoryItem(index: number) {
    this.input.inventoryItem = index;
    this.markFieldDirty("input");
  }

  setAsFiring(firing: boolean) {
    this.input.fire = firing;
  }

  setAsInteracting(interacting: boolean) {
    this.input.interact = interacting;
  }

  setAsDropping(dropping: boolean) {
    this.input.drop = dropping;
  }

  setUseItem(use: boolean) {
    this.input.consume = use;
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
    this.skin = skin;
  }

  getSkin(): SkinType {
    return this.skin;
  }

  incrementKills() {
    this.kills++;
  }

  getKills(): number {
    return this.kills;
  }

  setPing(ping: number): void {
    this.ping = ping;
  }

  getPing(): number {
    return this.ping;
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
