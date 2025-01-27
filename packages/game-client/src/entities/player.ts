import { animate } from "@/animations";
import {
  ClientDestructible,
  ClientPositionable,
  ClientMovable,
  ClientIgnitable,
  ClientInteractive,
} from "@/extensions";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ImageLoader, getItemAssetKey, Asset } from "@/managers/asset";
import { GameState } from "@/state";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "@/util/debug";
import { createFlashEffect } from "@/util/render";
import { Z_INDEX } from "@shared/map";
import { Direction, normalizeDirection } from "../../../game-shared/src/util/direction";
import { getHitboxWithPadding, Hitbox } from "../../../game-shared/src/util/hitbox";
import { Input } from "../../../game-shared/src/util/input";
import { InventoryItem } from "../../../game-shared/src/util/inventory";
import { roundVector2 } from "../../../game-shared/src/util/physics";
import { RawEntity } from "@shared/types/entity";
import { IClientEntity, Renderable, getFrameIndex, drawHealthBar } from "@/entities/util";
import { MAX_PLAYER_HEALTH } from "@shared/constants/constants";
import Vector2 from "@shared/util/vector2";
import { ClientEntity } from "./client-entity";
import { SKIN_TYPES, SkinType } from "@shared/commands/commands";

export class PlayerClient extends ClientEntity implements IClientEntity, Renderable {
  private readonly ARROW_LENGTH = 20;

  private lastRenderPosition = { x: 0, y: 0 };
  private inventory: InventoryItem[] = [];
  private isCrafting = false;
  private activeItem: InventoryItem | null = null;
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  private skin: SkinType = SKIN_TYPES.DEFAULT;
  private kills: number = 0;
  private ping: number = 0;

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

  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
    this.inventory = data.inventory;
    this.isCrafting = data.isCrafting;
    this.activeItem = data.activeItem;
    this.input = data.input;
    this.skin = data.skin || SKIN_TYPES.DEFAULT;
    this.kills = data.kills || 0;
    this.ping = data.ping || 0;
  }

  private getPlayerAssetKey(): string {
    return this.skin === SKIN_TYPES.WDC ? "player_wdc" : "player";
  }

  getInventory(): InventoryItem[] {
    return this.inventory;
  }

  getInput(): Input {
    return this.input;
  }

  getIsCrafting(): boolean {
    return this.isCrafting;
  }

  getMaxHealth(): number {
    return MAX_PLAYER_HEALTH;
  }

  isDead(): boolean {
    return this.getExt(ClientDestructible).isDead();
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getPosition();
  }

  setPosition(position: Vector2): void {
    const positionable = this.getExt(ClientPositionable);
    positionable.setPosition(position);
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getCenterPosition();
  }

  getVelocity(): Vector2 {
    const movable = this.getExt(ClientMovable);
    return movable.getVelocity();
  }

  getDamageBox(): Hitbox {
    const positionable = this.getExt(ClientPositionable);
    return getHitboxWithPadding(positionable.getPosition(), 0);
  }

  getHealth(): number {
    return this.getExt(ClientDestructible).getHealth();
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const targetPosition = this.getPosition();
    const { facing } = this.input;
    const isMoving = this.getVelocity().x !== 0 || this.getVelocity().y !== 0;

    let image: HTMLImageElement;
    const assetKey = this.getPlayerAssetKey();

    if (this.isDead()) {
      image = this.imageLoader.getWithDirection(assetKey, Direction.Down);
    } else if (!isMoving) {
      image = this.imageLoader.getWithDirection(assetKey, facing);
    } else {
      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: 500,
        frames: 3,
      });
      image = this.imageLoader.getFrameWithDirection(assetKey, facing, frameIndex);
    }
    const dx = targetPosition.x - this.lastRenderPosition.x;
    const dy = targetPosition.y - this.lastRenderPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      this.lastRenderPosition.x = targetPosition.x;
      this.lastRenderPosition.y = targetPosition.y;
    } else {
      this.lastRenderPosition = this.lerpPosition(
        targetPosition,
        new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
      );
    }

    const renderPosition = roundVector2(
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    ctx.save();

    if (this.isDead()) {
      ctx.globalAlpha = 0.7;
      ctx.translate(renderPosition.x, renderPosition.y);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.drawImage(image, renderPosition.x, renderPosition.y);

      if (this.hasExt(ClientIgnitable)) {
        const frameIndex = getFrameIndex(gameState.startedAt, {
          duration: 500,
          frames: 5,
        });
        const fireImg = this.imageLoader.getFrameIndex("flame", frameIndex);
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

    drawCenterPositionWithLabel(ctx, this.getCenterPosition());

    if (this.isCrafting) {
      ctx.font = "8px Arial";
      const animatedPosition = animate(gameState.startedAt, renderPosition, {
        duration: 2000,
        frames: {
          0: new Vector2(0, 0),
          50: new Vector2(0, 5),
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
    const image = this.imageLoader.getWithDirection(getItemAssetKey(this.activeItem), facing);
    ctx.drawImage(image, renderPosition.x + 2, renderPosition.y);
  }

  public getKills(): number {
    return this.kills;
  }

  public getPing(): number {
    return this.ping;
  }

  deserialize(data: RawEntity): void {
    super.deserialize(data);
    this.inventory = data.inventory;
    this.isCrafting = data.isCrafting;
    this.activeItem = data.activeItem;
    this.input = data.input;
    this.skin = data.skin || SKIN_TYPES.DEFAULT;
    this.kills = data.kills || 0;
    this.ping = data.ping || 0;
  }
}
