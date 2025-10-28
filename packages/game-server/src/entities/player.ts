import { PlayerDroppedItemEvent } from "@shared/events/server-sent/player-dropped-item-event";
import { PlayerHurtEvent } from "@shared/events/server-sent/player-hurt-event";
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
import { PlayerDeathEvent } from "@shared/events/server-sent/player-death-event";
import { DEBUG_WEAPONS } from "@shared/debug";
import {
  MAX_INTERACT_RADIUS,
  MAX_PLAYER_HEALTH,
  PLAYER_SPEED,
  SPRINT_MULTIPLIER,
  MAX_STAMINA,
  STAMINA_DRAIN_RATE,
  STAMINA_REGEN_RATE,
  EXHAUSTION_DURATION,
} from "@shared/constants/constants";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";
import Carryable from "@/extensions/carryable";
import { SkinType, SKIN_TYPES } from "@shared/commands/commands";

export class Player extends Entity {
  private static readonly PLAYER_WIDTH = 16;
  private static readonly DROP_COOLDOWN = 0.25;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly CONSUME_COOLDOWN = 0.5;

  private fireCooldown = new Cooldown(0.4, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN, true);
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
    sprint: false,
  };
  private isCrafting = false;
  private broadcaster: Broadcaster;
  private lastWeaponType: ItemType | null = null;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private kills: number = 0;
  private ping: number = 0;
  private displayName: string = "";
  private stamina: number = MAX_STAMINA;
  private exhaustionTimer: number = 0; // Time remaining before stamina can regenerate
  private coins: number = 0;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.PLAYER);
    this.broadcaster = gameManagers.getBroadcaster();

    this.extensions = [
      new Inventory(this, gameManagers.getBroadcaster()),
      new Collidable(this)
        .setSize(new Vector2(Player.PLAYER_WIDTH - 4, Player.PLAYER_WIDTH - 4))
        .setOffset(new Vector2(2, 2)),
      new Positionable(this).setSize(new Vector2(Player.PLAYER_WIDTH, Player.PLAYER_WIDTH)),
      new Destructible(this)
        .setHealth(MAX_PLAYER_HEALTH)
        .setMaxHealth(MAX_PLAYER_HEALTH)
        .onDeath(() => this.onDeath()),
      new Updatable(this, this.updatePlayer.bind(this)),
      new Movable(this),
      new Illuminated(this, 200),
      new Groupable(this, "friendly"),
    ];

    const inventory = this.getExt(Inventory);

    if (DEBUG_WEAPONS) {
      [
        {
          itemType: "pistol_ammo" as const,
          state: {
            count: 10,
          },
        },
        { itemType: "pistol" as const },
        {
          itemType: "shotgun" as const,
        },
        { itemType: "shotgun_ammo" as const, state: { count: 10 } },
        { itemType: "torch" as const },
        { itemType: "gasoline" as const },
        { itemType: "spikes" as const },
        { itemType: "landmine" as const },
      ].forEach((item) => inventory.addItem(item));
    }
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

    // Add Interactive extension for revival
    this.addExtension(
      new Interactive(this)
        .onInteract((interactingPlayerId: string) => this.revive())
        .setDisplayName("revive")
        .setOffset(new Vector2(-2, -5))
    );
  }

  revive(): void {
    if (!this.isDead()) return;

    // Find and remove the Interactive extension
    const interactive = this.extensions.find((ext) => ext instanceof Interactive);
    if (interactive) {
      this.removeExtension(interactive);
    }

    // Re-enable collision
    this.getExt(Collidable).setEnabled(true);

    // Set health to 2
    this.getExt(Destructible).setHealth(2);
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

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      inventory: this.getExt(Inventory).getItems(),
      activeItem: this.activeItem,
      isCrafting: this.isCrafting,
      input: this.input,
      skin: this.skin,
      kills: this.kills,
      ping: this.ping,
      displayName: this.displayName,
      stamina: this.stamina,
      maxStamina: MAX_STAMINA,
      coins: this.coins,
    };
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
    this.getExt(Inventory).craftRecipe(recipe);
    this.setIsCrafting(false);
  }

  handleAttack(deltaTime: number) {
    this.fireCooldown.update(deltaTime);

    if (!this.input.fire) return;

    const activeWeapon = this.getActiveWeapon();
    if (activeWeapon === null) return;

    const weaponEntity = this.getEntityManager().createEntityFromItem(activeWeapon);
    if (!(weaponEntity && weaponEntity instanceof Weapon)) return;

    if (this.fireCooldown === null || this.lastWeaponType !== activeWeapon.itemType) {
      this.fireCooldown = new Cooldown(weaponEntity.getCooldown(), true);
      this.lastWeaponType = activeWeapon.itemType;
    }

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();
      weaponEntity.attack(this.getId(), this.getCenterPosition(), this.input.facing);
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
    if (currentSpeed < PLAYER_SPEED * 2) {
      // Set velocity based on current input
      if (this.input.dx === 0 && this.input.dy === 0) {
        movable.setVelocity(new Vector2(0, 0));
      } else {
        const normalized = normalizeVector(new Vector2(this.input.dx, this.input.dy));

        // Can only sprint if: has stamina AND not exhausted
        const canSprint = this.input.sprint && this.stamina > 0 && this.exhaustionTimer <= 0;
        const speedMultiplier = canSprint ? SPRINT_MULTIPLIER : 1;

        // Drain stamina while sprinting
        if (canSprint) {
          const newStamina = this.stamina - STAMINA_DRAIN_RATE * deltaTime;
          this.stamina = Math.max(0, newStamina);

          // If stamina just hit zero, start exhaustion timer
          if (this.stamina === 0) {
            this.exhaustionTimer = EXHAUSTION_DURATION;
          }
        }

        movable.setVelocity(
          new Vector2(
            normalized.x * PLAYER_SPEED * speedMultiplier,
            normalized.y * PLAYER_SPEED * speedMultiplier
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
      const entities = this.getEntityManager()
        .getNearbyEntities(this.getCenterPosition())
        .filter((entity) => {
          return entity.hasExt(Interactive);
        });

      // First sort by type (dead players first) then by distance
      const byPriorityAndProximity = entities
        .sort((a, b) => {
          // Check if entities are players and are dead
          const aIsDeadPlayer = a.getType() === Entities.PLAYER && (a as Player).isDead();
          const bIsDeadPlayer = b.getType() === Entities.PLAYER && (b as Player).isDead();

          // Dead players should come first
          if (aIsDeadPlayer && !bIsDeadPlayer) return -1;
          if (!aIsDeadPlayer && bIsDeadPlayer) return 1;

          // If both are dead players or both are not, sort by distance
          const p1 = (a as Entity).getExt(Positionable).getCenterPosition();
          const p2 = (b as Entity).getExt(Positionable).getCenterPosition();
          return distance(this.getCenterPosition(), p1) - distance(this.getCenterPosition(), p2);
        })
        .filter((entity) => {
          if (
            distance(this.getCenterPosition(), entity.getExt(Positionable).getCenterPosition()) >
            MAX_INTERACT_RADIUS
          ) {
            return false;
          }
          return true;
        });
      if (byPriorityAndProximity.length > 0) {
        const entity = byPriorityAndProximity[0];
        (entity as Entity).getExt(Interactive).interact(this.getId());
      }
    }
  }

  handleDrop(deltaTime: number) {
    this.dropCooldown.update(deltaTime);

    if (!this.input.drop) return;

    if (this.dropCooldown.isReady() && this.input.inventoryItem !== null) {
      this.dropCooldown.reset();
      const itemIndex = this.input.inventoryItem - 1;
      const item = this.getExt(Inventory).removeItem(itemIndex);

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

    if (this.consumeCooldown.isReady() && this.input.inventoryItem !== null) {
      this.consumeCooldown.reset();
      const itemIndex = this.input.inventoryItem - 1;
      const item = this.getExt(Inventory).getItems()[itemIndex];

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
    if (this.exhaustionTimer <= 0 && this.stamina < MAX_STAMINA) {
      const isMoving = this.input.dx !== 0 || this.input.dy !== 0;
      const isSprinting = this.input.sprint && isMoving && this.stamina > 0;

      // Regenerate stamina when not sprinting
      if (!isSprinting) {
        this.stamina = Math.min(
          MAX_STAMINA,
          this.stamina + STAMINA_REGEN_RATE * deltaTime
        );
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
  }

  setInput(input: Input) {
    this.input = input;
  }

  selectInventoryItem(index: number) {
    this.input.inventoryItem = index;
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
    this.coins += amount;
  }

  getCoins(): number {
    return this.coins;
  }
}
