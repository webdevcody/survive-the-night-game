import { ToxicBiomeZoneClient } from "@/entities/environment/toxic-biome-zone";
import { ClientPositionable } from "@/extensions/positionable";
import { worldToMapCoordinates } from "./map-rendering-utils";

export interface ToxicZoneRendererSettings {
  colors: {
    toxicGas: string;
  };
}

/**
 * Render toxic biome zones as filled rectangles
 */
export function renderToxicZones(
  ctx: CanvasRenderingContext2D,
  toxicZoneEntities: ToxicBiomeZoneClient[],
  playerPos: { x: number; y: number },
  settings: ToxicZoneRendererSettings,
  centerX: number,
  centerY: number,
  scale: number
): void {
  if (toxicZoneEntities.length === 0) return;

  ctx.save();
  ctx.fillStyle = settings.colors.toxicGas;

  // Small overlap to prevent gaps between adjacent zones due to floating-point precision
  const overlap = 1;

  for (const zone of toxicZoneEntities) {
    if (!zone.hasExt(ClientPositionable)) continue;

    const positionable = zone.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    // Calculate position relative to player
    const relativeX = position.x - playerPos.x;
    const relativeY = position.y - playerPos.y;

    // Convert to map coordinates
    const mapCoords = worldToMapCoordinates(
      position.x,
      position.y,
      playerPos,
      centerX,
      centerY,
      scale
    );
    const mapWidth = size.x * scale + overlap;
    const mapHeight = size.y * scale + overlap;

    // Draw the toxic zone as a filled rectangle
    ctx.fillRect(mapCoords.x, mapCoords.y, mapWidth, mapHeight);
  }

  ctx.restore();
}
