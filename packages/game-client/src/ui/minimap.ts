import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { ZombieClient } from "@/entities/zombie";
import { BigZombieClient } from "@/entities/big-zombie";
import { FastZombieClient } from "@/entities/fast-zombie";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { TILE_IDS } from "@shared/map";
import { AcidProjectileClient } from "@/entities/acid-projectile";
import { SpitterZombieClient } from "@/entities/spitter-zombie";
import { BatZombieClient } from "@/entities/bat-zombie";
import { ClientDestructible } from "@/extensions/destructible";
import { ExplodingZombieClient } from "@/entities/exploding-zombie";

export const MINIMAP_SETTINGS = {
  size: 400,
  left: 40,
  bottom: 40,
  background: "rgba(0, 0, 0, 0.7)",
  scale: 0.7,
  colors: {
    enemy: "red",
    deadEnemy: "gray",
    player: "green",
    wall: "white",
    item: "yellow",
    tree: "gray",
    acid: "green",
    bat: "blue",
    spitter: "purple",
  },
  indicators: {
    acid: {
      shape: "circle",
      size: 6,
    },
    enemy: {
      shape: "circle",
      size: 6,
    },
    player: {
      shape: "rectangle",
      size: 8,
    },
    wall: {
      shape: "rectangle",
      size: 8,
    },
    item: {
      shape: "circle",
      size: 6,
    },
    tree: {
      shape: "rectangle",
      size: 8,
    },
  },
};

export class Minimap {
  private mapManager: MapManager;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const settings = MINIMAP_SETTINGS;
    const myPlayer = getPlayer(gameState);
    if (!myPlayer || !myPlayer.hasExt(ClientPositionable)) return;

    const playerPos = myPlayer.getExt(ClientPositionable).getPosition();
    const tileSize = 16; // This should match the tile size in MapManager

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Calculate position from bottom
    const top = ctx.canvas.height - settings.bottom - settings.size;

    // Create circular clip
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();

    // Draw minimap background
    ctx.fillStyle = settings.background;
    ctx.fillRect(settings.left, top, settings.size, settings.size);

    // Draw forest tiles
    const map = this.mapManager.getMap();
    if (map) {
      ctx.fillStyle = settings.colors.tree;
      map.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === TILE_IDS.FOREST) {
            const worldX = x * tileSize;
            const worldY = y * tileSize;

            // Calculate relative position to player
            const relativeX = worldX - playerPos.x;
            const relativeY = worldY - playerPos.y;

            // Convert to minimap coordinates (centered on player)
            const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
            const minimapY = top + settings.size / 2 + relativeY * settings.scale;

            const treeIndicator = settings.indicators.tree;
            const size = treeIndicator.size;
            const halfSize = size / 2;

            // Draw tree indicator based on shape
            if (treeIndicator.shape === "circle") {
              ctx.beginPath();
              ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
            }
          }
        });
      });
    }

    // Loop through all entities and draw them on minimap
    for (const entity of gameState.entities) {
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Convert to minimap coordinates (centered on player)
      const minimapX = settings.left + settings.size / 2 + relativeX * settings.scale;
      const minimapY = top + settings.size / 2 + relativeY * settings.scale;

      // Determine indicator settings based on entity type
      let indicator = null;
      let color = null;

      if (
        entity instanceof ZombieClient ||
        entity instanceof BigZombieClient ||
        entity instanceof FastZombieClient ||
        entity instanceof BatZombieClient ||
        entity instanceof SpitterZombieClient ||
        entity instanceof ExplodingZombieClient
      ) {
        indicator = settings.indicators.enemy;
        // Check if zombie is dead
        if (entity.hasExt(ClientDestructible) && entity.getExt(ClientDestructible).isDead()) {
          color = settings.colors.deadEnemy;
        } else {
          color = settings.colors.enemy;
        }
      } else if (entity instanceof PlayerClient) {
        color = settings.colors.player;
        indicator = settings.indicators.player;
      } else if (entity instanceof WallClient) {
        color = settings.colors.wall;
        indicator = settings.indicators.wall;
      } else if (entity.hasExt(ClientCarryable)) {
        color = settings.colors.item;
        indicator = settings.indicators.item;
      } else if (entity instanceof AcidProjectileClient) {
        color = settings.colors.acid;
        indicator = settings.indicators.acid;
      }

      if (color && indicator) {
        ctx.fillStyle = color;
        const size = indicator.size;
        const halfSize = size / 2;

        // Draw indicator based on shape
        if (indicator.shape === "circle") {
          ctx.beginPath();
          ctx.arc(minimapX, minimapY, halfSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(minimapX - halfSize, minimapY - halfSize, size, size);
        }
      }
    }

    // Draw radar circle border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      settings.left + settings.size / 2,
      top + settings.size / 2,
      settings.size / 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Draw crosshair at center (player position)
    const crosshairSize = 6;
    ctx.strokeStyle = settings.colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(settings.left + settings.size / 2 - crosshairSize, top + settings.size / 2);
    ctx.lineTo(settings.left + settings.size / 2 + crosshairSize, top + settings.size / 2);
    ctx.moveTo(settings.left + settings.size / 2, top + settings.size / 2 - crosshairSize);
    ctx.lineTo(settings.left + settings.size / 2, top + settings.size / 2 + crosshairSize);
    ctx.stroke();

    ctx.restore();
  }
}
