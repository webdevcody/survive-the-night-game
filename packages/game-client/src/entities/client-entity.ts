import { RawEntity } from "@shared/types/entity";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ImageLoader } from "@/managers/asset";
import { ClientInteractive, ClientPlaceable, ClientPositionable } from "@/extensions";
import Vector2 from "@shared/util/vector2";
import { DEBUG_SHOW_ATTACK_RANGE } from "@shared/debug";
import { getConfig } from "@shared/config";
import { formatDisplayName } from "@/util/format";

export abstract class ClientEntity extends ClientEntityBase implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  abstract getZIndex(): number;

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (myPlayer && interactive.getDisplayName()) {
      const displayName = formatDisplayName(interactive.getDisplayName());
      const isPlaceable = this.hasExt(ClientPlaceable);

      let text = displayName;
      let interactMessage = "";
      if (isPlaceable) {
        interactMessage += "hold ";
      }
      interactMessage += `${getConfig().keybindings.INTERACT}`;
      text += ` (${interactMessage})`;

      renderInteractionText(
        ctx,
        text,
        positionable.getCenterPosition(),
        positionable.getPosition(),
        myPlayer.getCenterPosition(),
        interactive.getOffset()
      );
    }
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.hasExt(ClientInteractive)) {
      this.renderInteractionText(ctx, gameState);
    }
  }

  public debugRenderAttackRange(
    ctx: CanvasRenderingContext2D,
    center: Vector2,
    attackRange: number
  ): void {
    if (!DEBUG_SHOW_ATTACK_RANGE) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, attackRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
