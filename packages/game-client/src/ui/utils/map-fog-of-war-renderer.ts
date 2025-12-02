import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { LightSource, isPositionVisible, mapToWorldCoordinates } from "./map-rendering-utils";

export interface FogOfWarSettings {
  enabled: boolean;
  fogColor: string;
}

/**
 * Render fog of war overlay for minimap (circular)
 */
export function renderMinimapFogOfWar(
  ctx: CanvasRenderingContext2D,
  playerPos: { x: number; y: number },
  lightSources: LightSource[],
  settings: FogOfWarSettings,
  centerX: number,
  centerY: number,
  radius: number,
  scale: number,
  top: number,
  scaledLeft: number,
  scaledSize: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!settings.enabled) return;

  // We'll render fog by checking a grid of points on the minimap
  // For better performance, we'll check at lower resolution and draw tiles
  const gridSize = 8; // Size of fog tiles in minimap pixels (scaled)
  const scaledGridSize = gridSize * (canvasWidth / 1920); // Scale based on canvas width
  const tilesPerRow = Math.ceil(scaledSize / scaledGridSize);

  // Pre-calculate rounded values to avoid sub-pixel gaps
  const roundedGridSize = Math.ceil(scaledGridSize);
  // Add 1 pixel overlap to eliminate gaps between tiles
  const drawSize = roundedGridSize + 1;

  const poolManager = PoolManager.getInstance();
  for (let ty = 0; ty < tilesPerRow; ty++) {
    for (let tx = 0; tx < tilesPerRow; tx++) {
      // Calculate minimap coordinates for this fog tile using scaled values
      const minimapX = scaledLeft + tx * scaledGridSize + scaledGridSize / 2;
      const minimapY = top + ty * scaledGridSize + scaledGridSize / 2;

      // Check if this position is within the circular minimap bounds
      const centerPos = poolManager.vector2.claim(centerX, centerY);
      const tilePos = poolManager.vector2.claim(minimapX, minimapY);
      const dist = distance(centerPos, tilePos);
      poolManager.vector2.release(centerPos);
      poolManager.vector2.release(tilePos);
      if (dist > radius) continue;

      // Convert minimap coordinates back to world coordinates
      const worldPos = mapToWorldCoordinates(minimapX, minimapY, playerPos, centerX, centerY, scale);
      const worldPosVec = poolManager.vector2.claim(worldPos.x, worldPos.y);

      // Check if this world position is visible
      if (!isPositionVisible(worldPosVec, lightSources)) {
        // Draw fog tile - use Math.floor for position and overlap for size to prevent gaps
        ctx.fillStyle = settings.fogColor;
        ctx.fillRect(
          Math.floor(minimapX - scaledGridSize / 2),
          Math.floor(minimapY - scaledGridSize / 2),
          drawSize,
          drawSize
        );
      }
      poolManager.vector2.release(worldPosVec);
    }
  }
}

/**
 * Render fog of war overlay for fullscreen map (rectangular)
 */
export function renderFullscreenMapFogOfWar(
  ctx: CanvasRenderingContext2D,
  playerPos: { x: number; y: number },
  lightSources: LightSource[],
  settings: FogOfWarSettings,
  zoom: number,
  centerX: number,
  centerY: number,
  mapWidth: number,
  mapHeight: number,
  mapX: number,
  mapY: number
): void {
  if (!settings.enabled) return;

  const gridSize = getConfig().world.TILE_SIZE; // Fog tile size in screen pixels
  const tilesX = Math.ceil(mapWidth / gridSize);
  const tilesY = Math.ceil(mapHeight / gridSize);

  const poolManager = PoolManager.getInstance();
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const screenX = mapX + tx * gridSize + gridSize / 2;
      const screenY = mapY + ty * gridSize + gridSize / 2;

      // Convert screen coordinates to world coordinates
      const worldPos = mapToWorldCoordinates(screenX, screenY, playerPos, centerX, centerY, zoom);
      const worldPosVec = poolManager.vector2.claim(worldPos.x, worldPos.y);

      if (!isPositionVisible(worldPosVec, lightSources)) {
        ctx.fillStyle = settings.fogColor;
        ctx.fillRect(screenX - gridSize / 2, screenY - gridSize / 2, gridSize, gridSize);
      }
      poolManager.vector2.release(worldPosVec);
    }
  }
}

