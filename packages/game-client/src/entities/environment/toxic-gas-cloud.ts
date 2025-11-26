import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getConfig } from "@shared/config";
import { ClientToxicGasCloudExtension } from "@/extensions/toxic-gas-cloud-extension";
import { environmentalEventsConfig } from "@shared/config/environmental-events-config";

/**
 * Client entity for toxic gas cloud
 */
export class ToxicGasCloudClient extends ClientEntity implements Renderable {
  public constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.hasExt(ClientPositionable)) return;

    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const size = positionable.getSize();

    // Get age and permanent status from extension if available
    let opacity = 0.3; // Default opacity
    let greenIntensity = 100; // Default green color intensity

    if (this.hasExt(ClientToxicGasCloudExtension)) {
      const extension = this.getExt(ClientToxicGasCloudExtension);
      const age = extension.age || 0;
      const isPermanent = extension.permanent;

      if (isPermanent) {
        // Permanent clouds (Battle Royale): fade in to bright green and stay
        // Fade in over 3 seconds, then stay at full opacity
        const fadeInDuration = 3;
        const fadeInProgress = Math.min(1, age / fadeInDuration);

        // Opacity: fade from 0.1 to 0.7
        opacity = 0.1 + fadeInProgress * 0.6;

        // Color: transition to brighter green (0, 200, 0) as it fades in
        greenIntensity = 100 + fadeInProgress * 100;
      } else {
        // Non-permanent clouds (Waves mode): fade in and out
        const maxAge = environmentalEventsConfig.TOXIC_GAS.ORIGINAL_LIFETIME;

        // Calculate opacity based on age: transparent at start/end, darkest in middle
        // Use quadratic easing: opacity = 1 - 4 * (age/maxAge - 0.5)^2
        // This creates a smooth curve that peaks at age = maxAge / 2
        const normalizedAge = Math.max(0, Math.min(1, age / maxAge));
        const distanceFromCenter = Math.abs(normalizedAge - 0.5);
        const normalizedOpacity = Math.max(0, 1 - 4 * distanceFromCenter * distanceFromCenter);

        // Scale opacity: transparent (0.05) at start/end, darkest (0.8) at middle
        opacity = 0.05 + normalizedOpacity * 0.75;
      }
    }

    // Render as transparent green rectangle with age-based opacity
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = `rgba(0, ${Math.floor(greenIntensity)}, 0, ${opacity})`;
    ctx.fillRect(position.x, position.y, size.x, size.y);
    ctx.restore();
  }
}
