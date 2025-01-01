import {
  roundVector2,
  Vector2,
  InventoryItem,
  Hitbox,
  Player,
  normalizeDirection,
  Direction,
  Input,
  GenericEntity,
  RawEntity,
  Positionable,
  Destructible,
  Ignitable,
} from "@survive-the-night/game-server";
import { AssetManager, getItemAssetKey } from "../managers/asset";
import { drawHealthBar, getFrameIndex, IClientEntity, Renderable } from "./util";
import { GameState } from "@/state";
import { getHitboxWithPadding } from "@survive-the-night/game-server/src/shared/entities/util";
import { debugDrawHitbox } from "../util/debug";
import { animate } from "../animations";
import { Z_INDEX } from "@survive-the-night/game-server/src/managers/map-manager";
import { createFlashEffect } from "../util/render";

export class PlayerClient extends GenericEntity implements IClientEntity, Renderable {
  private readonly LERP_FACTOR = 0.1;
  private readonly ARROW_LENGTH = 20;

  private assetManager: AssetManager;
  private lastRenderPosition = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private inventory: InventoryItem[] = [];
  private isCrafting = false;
  private activeItem: InventoryItem | null = null;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;

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

  public getZIndex(): number {
    return Z_INDEX.PLAYERS;
  }

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data);
    this.inventory = data.inventory;
    this.isCrafting = data.isCrafting;
    this.activeItem = data.activeItem;
    this.input = data.input;
    this.assetManager = assetManager;
  }

  getInventory(): InventoryItem[] {
    return this.inventory;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  getMaxHealth(): number {
    return Player.MAX_HEALTH;
  }

  isDead(): boolean {
    return this.getExt(Destructible).isDead();
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getPosition();
  }

  setPosition(position: Vector2): void {
    const positionable = this.getExt(Positionable);
    positionable.setPosition(position);
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    return positionable.getPosition();
  }

  setVelocity(velocity: Vector2): void {
    this.velocity = velocity;
  }

  getDamageBox(): Hitbox {
    const positionable = this.getExt(Positionable);
    return getHitboxWithPadding(positionable.getPosition(), 0);
  }

  getHealth(): number {
    return this.getExt(Destructible).getHealth();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

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
    const dx = targetPosition.x - this.lastRenderPosition.x;
    const dy = targetPosition.y - this.lastRenderPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      this.lastRenderPosition.x = targetPosition.x;
      this.lastRenderPosition.y = targetPosition.y;
    } else {
      this.lastRenderPosition.x += dx * this.LERP_FACTOR;
      this.lastRenderPosition.y += dy * this.LERP_FACTOR;
    }

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

      if (this.hasExt(Ignitable)) {
        const fireImg = this.assetManager.get("Fire");
        ctx.drawImage(fireImg, renderPosition.x, renderPosition.y);
      }

      this.renderInventoryItem(ctx, renderPosition);
    }

    if (Date.now() < this.damageFlashUntil) {
      const flashEffect = createFlashEffect(image);
      ctx.drawImage(flashEffect, renderPosition.x, renderPosition.y);
    }

    ctx.restore();

    if (!this.isDead()) {
      this.renderArrow(ctx, image, renderPosition);
    }

    drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());

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

  deserialize(data: RawEntity): void {
    super.deserialize(data);
    this.inventory = data.inventory;
    this.isCrafting = data.isCrafting;
    this.activeItem = data.activeItem;
    this.input = data.input;
  }
}
