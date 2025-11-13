import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import {
  ClientPositionable,
  ClientMovable,
  ClientDestructible,
  ClientInteractive,
} from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getFrameIndex, drawHealthBar } from "@/entities/util";
import { determineDirection } from "@shared/util/direction";
import { roundVector2 } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";
import { getConfig } from "@shared/config";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";

const SURVIVOR_ANIMATION_DURATION = 500;

export class SurvivorClient extends ClientEntity implements Renderable {
  private lastRenderPosition = { x: 0, y: 0 };
  private previousHealth: number | undefined;
  private damageFlashUntil: number = 0;
  private isRescued: boolean = false;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.isRescued = data.isRescued || false;
  }

  public deserialize(data: RawEntity): void {
    super.deserialize(data);
    if (data.isRescued !== undefined) {
      this.isRescued = data.isRescued;
    }
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  private getSurvivorAssetPrefix(): string {
    return "survivor";
  }

  private getPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getPosition();
  }

  private getCenterPosition(): Vector2 {
    const positionable = this.getExt(ClientPositionable);
    return positionable.getCenterPosition();
  }

  private getVelocity(): Vector2 {
    const movable = this.getExt(ClientMovable);
    return movable.getVelocity();
  }

  private getHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getHealth();
  }

  private getMaxHealth(): number {
    const destructible = this.getExt(ClientDestructible);
    return destructible.getMaxHealth();
  }

  private isDead(): boolean {
    const destructible = this.getExt(ClientDestructible);
    return destructible.isDead();
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const currentHealth = this.getHealth();

    if (this.previousHealth !== undefined && currentHealth < this.previousHealth) {
      this.damageFlashUntil = Date.now() + 250;
    }
    this.previousHealth = currentHealth;

    const isDead = this.isDead();

    // Only update position if alive to prevent jittering when dead
    if (!isDead) {
      const targetPosition = this.getPosition();
      this.lastRenderPosition = this.lerpPosition(
        targetPosition,
        new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
      );
    }

    const renderPosition = roundVector2(
      new Vector2(this.lastRenderPosition.x, this.lastRenderPosition.y)
    );

    if (isDead) {
      this.renderDead(ctx, renderPosition, gameState);
    } else {
      this.renderAlive(ctx, renderPosition, gameState);
    }

    // Render interaction text (calls super.render which handles it)
    super.render(ctx, gameState);
  }

  private renderAlive(
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2,
    gameState: GameState
  ): void {
    const facing = determineDirection(this.getVelocity());
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: SURVIVOR_ANIMATION_DURATION,
      frames: 3,
    });
    
    const image = this.imageLoader.getFrameWithDirection(
      this.getSurvivorAssetPrefix() as any,
      facing,
      frameIndex
    );
    
    ctx.drawImage(image, renderPosition.x, renderPosition.y);
    drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());

    // Render flash effect on damage
    if (Date.now() <= this.damageFlashUntil) {
      const flashImage = this.imageLoader.getFrameWithDirection(
        this.getSurvivorAssetPrefix() as any,
        facing,
        frameIndex
      );
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(flashImage, renderPosition.x, renderPosition.y);
      ctx.restore();
    }
  }

  private renderDead(
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2,
    gameState: GameState
  ): void {
    const myPlayer = getPlayer(gameState);
    const image = this.imageLoader.get(`${this.getSurvivorAssetPrefix()}_dead` as any);
    
    if (image) {
      ctx.drawImage(image, renderPosition.x, renderPosition.y);
    }

    // Render loot interaction text
    if (myPlayer && this.hasExt(ClientInteractive)) {
      const positionable = this.getExt(ClientPositionable);
      const size = positionable.getSize();
      const centerPosition = new Vector2(
        renderPosition.x + size.x / 2,
        renderPosition.y + size.y / 2
      );

      renderInteractionText(
        ctx,
        `loot (${getConfig().keybindings.INTERACT})`,
        centerPosition,
        renderPosition,
        myPlayer.getPosition()
      );
    }
  }

}

