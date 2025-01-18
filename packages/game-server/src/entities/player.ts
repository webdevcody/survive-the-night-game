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
import { MAX_INTERACT_RADIUS, MAX_PLAYER_HEALTH } from "@shared/constants/constants";
import Vector2 from "@/util/vector2";
import { Rectangle } from "@/util/shape";

export class Player extends Entity {
  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_SPEED = 60;
  private static readonly DROP_COOLDOWN = 0.25;
  private static readonly INTERACT_COOLDOWN = 0.25;
  private static readonly FIRE_COOLDOWN = 0.4;
  private static readonly CONSUME_COOLDOWN = 0.5;

  private fireCooldown = new Cooldown(Player.FIRE_COOLDOWN, true);
  private dropCooldown = new Cooldown(Player.DROP_COOLDOWN, true);
  private interactCooldown = new Cooldown(Player.INTERACT_COOLDOWN, true);
  private consumeCooldown = new Cooldown(Player.CONSUME_COOLDOWN, true);
  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 0,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
  };
  private isCrafting = false;
  private broadcaster: Broadcaster;

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

    if (DEBUG_WEAPONS) {
      const inventory = this.getExt(Inventory);
      [
        {
          key: "pistol_ammo" as const,
          state: {
            count: 10,
          },
        },
        { key: "pistol" as const },
        {
          key: "shotgun" as const,
          state: {
            count: 10,
          },
        },
        { key: "shotgun_ammo" as const, state: { count: 10 } },
        { key: "torch" as const },
        { key: "gasoline" as const },
        { key: "spikes" as const },
        { key: "landmine" as const },
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
    this.broadcaster.broadcastEvent(new PlayerDeathEvent(this.getId()));
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
    };
  }

  getHitbox(): Rectangle {
    const collidable = this.getExt(Collidable);
    const hitbox = collidable.getHitBox();
    return hitbox;
  }

  setVelocityFromInput(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      this.getExt(Movable).setVelocity(new Vector2(0, 0));
      return;
    }

    const normalized = normalizeVector(new Vector2(dx, dy));
    this.getExt(Movable).setVelocity(
      new Vector2(normalized.x * Player.PLAYER_SPEED, normalized.y * Player.PLAYER_SPEED)
    );
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

    if (this.fireCooldown.isReady()) {
      this.fireCooldown.reset();

      // Create weapon entity and use its attack method
      const weaponEntity = this.getEntityManager().createEntityFromItem(activeWeapon);
      if (weaponEntity && weaponEntity instanceof Weapon) {
        weaponEntity.attack(this.getId(), this.getCenterPosition(), this.input.facing);
      }
    }
  }

  handleMovement(deltaTime: number) {
    const position = this.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    const movable = this.getExt(Movable);
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

  handleInteract(deltaTime: number) {
    this.interactCooldown.update(deltaTime);

    if (!this.input.interact) return;

    if (this.interactCooldown.isReady()) {
      this.interactCooldown.reset();
      const entities = this.getEntityManager()
        .getNearbyEntities(this.getPosition())
        .filter((entity) => {
          return entity.hasExt(Interactive);
        });

      const byProximity = entities
        .sort((a, b) => {
          const p1 = (a as Entity).getExt(Positionable).getPosition();
          const p2 = (b as Entity).getExt(Positionable).getPosition();
          return distance(this.getPosition(), p1) - distance(this.getPosition(), p2);
        })
        .filter((entity) => {
          if (
            distance(this.getPosition(), entity.getExt(Positionable).getPosition()) >
            MAX_INTERACT_RADIUS
          ) {
            return false;
          }
          return true;
        });
      if (byProximity.length > 0) {
        const entity = byProximity[0];
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
            itemKey: item.key,
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

        if (entity.hasExt(Consumable)) {
          entity.getExt(Consumable).consume(this.getId(), itemIndex);
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
}
