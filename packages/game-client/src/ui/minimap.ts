import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";
import { PlayerClient } from "@/entities/player";
import { WallClient } from "@/entities/items/wall";
import { ClientCarryable } from "@/extensions/carryable";
import { MapManager } from "@/managers/map";
import { AcidProjectileClient } from "@/entities/acid-projectile";
import { ClientDestructible } from "@/extensions/destructible";
import { EntityCategories } from "@shared/entities";

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
  biomeIndicators: {
    farm: {
      label: "F",
      color: "#8B4513",
      iconColor: "#FFFFFF",
    },
    city: {
      label: "C",
      color: "#4169E1",
      iconColor: "#FFFFFF",
    },
    gasStation: {
      label: "G",
      color: "#FFD700",
      iconColor: "#000000",
    },
    campsite: {
      label: "H",
      color: "#228B22",
      iconColor: "#FFFFFF",
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

    // Draw collidable tiles (obstacles like trees, walls, water)
    const mapData = this.mapManager.getMapData();
    if (mapData && mapData.collidables) {
      ctx.fillStyle = settings.colors.tree;
      mapData.collidables.forEach((row, y) => {
        row.forEach((cell, x) => {
          // If there's a collidable (anything other than -1), draw it
          if (cell !== -1) {
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

            // Draw obstacle indicator based on shape
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

      // Determine indicator settings based on entity category
      let indicator = null;
      let color = null;

      const category = entity.getCategory();

      if (category === EntityCategories.ZOMBIE) {
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

    // Draw biome directional indicators
    this.renderBiomeIndicators(ctx, playerPos, settings, top);

    // Draw player directional indicators
    this.renderPlayerIndicators(ctx, gameState, playerPos, settings, top);

    ctx.restore();
  }

  private renderBiomeIndicators(
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const biomePositions = this.mapManager.getBiomePositions();
    if (!biomePositions) return;

    const BIOME_SIZE = 16; // tiles
    const TILE_SIZE = 16; // pixels
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const radius = settings.size / 2;

    const biomes = [
      { name: "farm", position: biomePositions.farm, config: settings.biomeIndicators.farm },
      { name: "city", position: biomePositions.city, config: settings.biomeIndicators.city },
      {
        name: "gasStation",
        position: biomePositions.gasStation,
        config: settings.biomeIndicators.gasStation,
      },
      {
        name: "campsite",
        position: biomePositions.campsite,
        config: settings.biomeIndicators.campsite,
      },
    ];

    biomes.forEach(({ position, config }) => {
      if (!position) return;

      // Convert biome position to world coordinates (center of biome)
      const biomeWorldX = (position.x * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;
      const biomeWorldY = (position.y * BIOME_SIZE + BIOME_SIZE / 2) * TILE_SIZE;

      // Calculate relative position to player
      const relativeX = biomeWorldX - playerPos.x;
      const relativeY = biomeWorldY - playerPos.y;

      // Calculate angle from player to biome
      const angle = Math.atan2(relativeY, relativeX);

      // Calculate distance from center of minimap
      const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY) * settings.scale;

      // If the biome is within the minimap view, skip directional indicator
      if (distance < radius - 30) return;

      // Calculate position on the edge of the minimap circle
      const edgeX = centerX + Math.cos(angle) * (radius - 20);
      const edgeY = centerY + Math.sin(angle) * (radius - 20);

      // Draw the indicator circle
      const indicatorSize = 16;
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, indicatorSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Draw the label text
      ctx.fillStyle = config.iconColor;
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(config.label, edgeX, edgeY);
    });
  }

  private renderPlayerIndicators(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    playerPos: { x: number; y: number },
    settings: typeof MINIMAP_SETTINGS,
    top: number
  ): void {
    const centerX = settings.left + settings.size / 2;
    const centerY = top + settings.size / 2;
    const radius = settings.size / 2;

    // Loop through all entities to find other players
    for (const entity of gameState.entities) {
      if (!(entity instanceof PlayerClient)) continue;
      if (!entity.hasExt(ClientPositionable)) continue;

      const positionable = entity.getExt(ClientPositionable);
      const position = positionable.getPosition();

      // Calculate relative position to my player
      const relativeX = position.x - playerPos.x;
      const relativeY = position.y - playerPos.y;

      // Skip if this is the current player (distance ~0)
      const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      if (distance < 10) continue; // Skip if very close (likely the same player)

      // Calculate scaled distance on minimap
      const scaledDistance = distance * settings.scale;

      // If the player is within the minimap view, skip directional indicator
      // (they're already shown as a regular indicator on the minimap)
      if (scaledDistance < radius - 30) continue;

      // Calculate angle from my player to other player
      const angle = Math.atan2(relativeY, relativeX);

      // Calculate position on the edge of the minimap circle
      const edgeX = centerX + Math.cos(angle) * (radius - 20);
      const edgeY = centerY + Math.sin(angle) * (radius - 20);

      // Draw the indicator - use a triangle pointing in the direction
      const indicatorSize = 12;

      // Draw filled triangle
      ctx.fillStyle = settings.colors.player;
      ctx.beginPath();
      ctx.moveTo(
        edgeX + Math.cos(angle) * indicatorSize,
        edgeY + Math.sin(angle) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle + (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle + (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle - (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle - (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.closePath();
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(
        edgeX + Math.cos(angle) * indicatorSize,
        edgeY + Math.sin(angle) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle + (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle + (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.lineTo(
        edgeX + Math.cos(angle - (2 * Math.PI) / 3) * indicatorSize,
        edgeY + Math.sin(angle - (2 * Math.PI) / 3) * indicatorSize
      );
      ctx.closePath();
      ctx.stroke();
    }
  }
}
