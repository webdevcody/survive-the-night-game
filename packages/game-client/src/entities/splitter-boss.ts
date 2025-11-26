import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { EnemyClient } from "./enemy-client";
import { GameState } from "@/state";
import Vector2 from "@shared/util/vector2";
import { getFrameIndex } from "@/entities/util";
import { determineDirection, Direction } from "@shared/util/direction";
import { ClientPositionable, ClientCollidable, ClientDestructible } from "@/extensions";
import { renderBossPresentation } from "./util/boss-presentation";
import { drawHealthBar } from "@/entities/util";
import { debugDrawHitbox, drawCenterPositionWithLabel } from "@/util/debug";
import { createFlashEffect } from "@/util/render";

const ZOMBIE_MOVEMENT_EPSILON = 0.5;

function isMoving(vector: Vector2): boolean {
  return (
    Math.abs(vector.x) > ZOMBIE_MOVEMENT_EPSILON || Math.abs(vector.y) > ZOMBIE_MOVEMENT_EPSILON
  );
}

export class SplitterBossClient extends EnemyClient {
  private splitGeneration: number = 0;

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    // Initialize splitGeneration from entity data if available
    if ((data as any).splitGeneration !== undefined) {
      this.splitGeneration = (data as any).splitGeneration;
    }
  }

  protected override renderEnemyAlive(
    gameState: GameState,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2
  ): void {
    const positionable = this.getExt(ClientPositionable);
    const collidable = this.getExt(ClientCollidable);
    const velocity = this.getVelocity();
    const movingByVelocity = isMoving(velocity);
    const shouldAnimate = movingByVelocity;

    // Get image using same logic as parent class
    let image: HTMLImageElement;
    if (shouldAnimate) {
      const facing = determineDirection(velocity);
      if (facing !== null) {
        (this as any).lastFacing = facing;
      }

      const frameIndex = getFrameIndex(gameState.startedAt, {
        duration: this.getAnimationDuration(),
        frames: this.getAnimationFrameCount(),
      });
      image = this.imageLoader.getFrameWithDirection(
        this.getEnemyAssetPrefix() as any,
        (this as any).lastFacing,
        frameIndex
      );
    } else {
      image = this.imageLoader.getWithDirection(
        this.getEnemyAssetPrefix() as any,
        (this as any).lastFacing
      );
    }

    // Calculate scale based on split generation
    // Original (generation 0) = 2.0 (double size), each split reduces size by 15%
    const scale = Math.max(0.4, 2.0 - this.splitGeneration * 0.3);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    // Center the scaled image
    const offsetX = (image.width - scaledWidth) / 2;
    const offsetY = (image.height - scaledHeight) / 2;

    // Draw scaled image
    ctx.drawImage(
      image,
      renderPosition.x + offsetX,
      renderPosition.y + offsetY,
      scaledWidth,
      scaledHeight
    );

    // Render boss presentation or health bar (same as parent)
    if (this.config.boss) {
      // Scale health bar width based on generation (relative to base scale of 2.0)
      const healthBarConfig = {
        ...this.config.boss.healthBar,
        width: (this.config.boss.healthBar?.width ?? 48) * (scale / 2.0),
      };
      const scaledMetadata = {
        ...this.config.boss,
        healthBar: healthBarConfig,
      };

      renderBossPresentation({
        ctx,
        metadata: scaledMetadata,
        renderPosition,
        entitySize: positionable.getSize(),
        health: this.getHealth(),
        maxHealth: this.getMaxHealth(),
      });
    } else {
      drawHealthBar(ctx, renderPosition, this.getHealth(), this.getMaxHealth());
    }

    // Debug hitboxes (same as parent)
    const destructible = this.getExt(ClientDestructible);
    debugDrawHitbox(ctx, collidable.getHitBox(), "yellow");
    debugDrawHitbox(ctx, destructible.getDamageBox(), "red");
    drawCenterPositionWithLabel(ctx, this.getCenterPosition());

    // Render flames and flash effects (same as parent)
    this.renderFlames(gameState, ctx, renderPosition);
    this.renderFlashEffectScaled(image, ctx, renderPosition, scale, offsetX, offsetY);
  }

  protected renderFlashEffectScaled(
    image: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    renderPosition: Vector2,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    if (Date.now() > this.damageFlashUntil) {
      return;
    }

    const flashEffect = createFlashEffect(image);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    // Draw scaled flash effect at the same position and size as the scaled sprite
    ctx.drawImage(
      flashEffect,
      renderPosition.x + offsetX,
      renderPosition.y + offsetY,
      scaledWidth,
      scaledHeight
    );
  }
}
