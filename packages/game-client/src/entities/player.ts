import {
  Entities,
  EntityType,
  PositionableTrait,
  roundVector2,
  Vector2,
  InventoryItem,
  Damageable,
  Hitbox,
  Player,
  normalizeDirection,
  Direction,
  Input,
} from "@survive-the-night/game-server";
import { AssetManager, getItemAssetKey } from "../managers/asset";
import { animate, drawHealthBar, getFrameIndex, IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";
import { getHitboxWithPadding } from "@survive-the-night/game-server/src/shared/entities/util";
import { debugDrawHitbox } from "../util/debug";

export class PlayerClient implements IClientEntity, Renderable, PositionableTrait, Damageable {
  private readonly LERP_FACTOR = 0.1;
  private readonly ARROW_LENGTH = 20;

  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private id: string;
  private type: EntityType;
  private health = Player.MAX_HEALTH;
  private inventory: InventoryItem[] = [];
  private isCrafting = false;
  private activeItem: InventoryItem | null = null;

  private input: Input = {
    facing: Direction.Right,
    inventoryItem: 1,
    dx: 0,
    dy: 0,
    interact: false,
    fire: false,
    drop: false,
    consume: false,
  };

  constructor(id: string, assetManager: AssetManager) {
    this.id = id;
    this.type = Entities.PLAYER;
    this.assetManager = assetManager;
  }

  heal(amount: number): void {
    this.health += amount;
  }

  getInventory(): InventoryItem[] {
    return this.inventory;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  getId(): string {
    return this.id;
  }

  getMaxHealth(): number {
    return Player.MAX_HEALTH;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  setId(id: string): void {
    this.id = id;
  }

  getType(): EntityType {
    return this.type;
  }

  setType(type: EntityType): void {
    this.type = type;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  getDamageBox(): Hitbox {
    return getHitboxWithPadding(this.position, 0);
  }

  damage(damage: number): void {
    this.health -= damage;
  }

  getHealth(): number {
    return this.health;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const targetPosition = this.getPosition();
    const { facing } = this.input;
    // const image = this.assetManager.getWithDirection("Player", this.isDead() ? "down" : facing);
    const isMoving = this.velocity.x !== 0 || this.velocity.y !== 0;

    let image: HTMLImageElement;

    if (this.isDead()) {
      image = this.assetManager.getWithDirection("Player", Direction.Down);
    } else if (!isMoving) {
      image = this.assetManager.getWithDirection("Player", facing);
    } else {
      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: 500,
        frames: 3,
      });
      image = this.assetManager.getFrameWithDirection("Player", facing, frameIndex);
    }

    this.lastRenderPosition.x += (targetPosition.x - this.lastRenderPosition.x) * this.LERP_FACTOR;
    this.lastRenderPosition.y += (targetPosition.y - this.lastRenderPosition.y) * this.LERP_FACTOR;

    const renderPosition = roundVector2(this.lastRenderPosition);

    ctx.save();

    if (this.isDead()) {
      ctx.globalAlpha = 0.7;
      ctx.translate(renderPosition.x + image.width / 2, renderPosition.y + image.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.drawImage(image, renderPosition.x, renderPosition.y);
      this.renderInventoryItem(ctx, renderPosition);
    }

    ctx.restore();

    if (!this.isDead()) {
      this.renderArrow(ctx, image, renderPosition);
    }

    drawHealthBar(ctx, renderPosition, this.health, this.getMaxHealth());

    debugDrawHitbox(ctx, this.getDamageBox(), "red");

    if (this.isCrafting) {
      ctx.font = "8px Arial";
      const animatedPosition = animate(gameState.startedAt, renderPosition, {
        duration: 2000,
        frames: {
          0: {
            x: 0,
            y: 0,
          },
          50: {
            x: 0,
            y: 5,
          },
        },
      });
      ctx.fillText("🔧", animatedPosition.x + 3, animatedPosition.y - 6);
    }
  }

  renderArrow(ctx: CanvasRenderingContext2D, image: HTMLImageElement, renderPosition: Vector2) {
    const { facing } = this.input;
    const direction = normalizeDirection(facing);

    if (direction === null) {
      return;
    }

    const arrowStart = {
      x: renderPosition.x + image.width / 2,
      y: renderPosition.y + image.height / 2,
    };

    const arrowEnd = {
      x: arrowStart.x + direction.x * this.ARROW_LENGTH,
      y: arrowStart.y + direction.y * this.ARROW_LENGTH,
    };

    const arrowColor = "white";

    const headLength = 5;
    const angle = Math.atan2(direction.y, direction.x);

    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle - Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowEnd.x - headLength * Math.cos(angle + Math.PI / 6),
      arrowEnd.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = arrowColor;
    ctx.fill();
  }

  renderInventoryItem(ctx: CanvasRenderingContext2D, renderPosition: Vector2) {
    if (this.activeItem === null) {
      return;
    }
    const { facing } = this.input;
    const image = this.assetManager.getWithDirection(getItemAssetKey(this.activeItem), facing);
    ctx.drawImage(image, renderPosition.x + 2, renderPosition.y);
  }
}
