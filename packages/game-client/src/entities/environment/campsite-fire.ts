import { ClientPositionable, ClientInteractive } from "@/extensions";
import { ClientEntity } from "@/entities/client-entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { RawEntity } from "@shared/types/entity";
import { Z_INDEX } from "@shared/map";
import { Renderable, getFrameIndex } from "@/entities/util";
import { getPlayer } from "@/util/get-player";
import { formatInteractKeyPrompt, renderInteractionText } from "@/util/interaction-text";
import { getConfig } from "@shared/config";
import { isAutoPickupItem } from "@/util/auto-pickup";

export class CampsiteFireClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (!myPlayer) {
      return;
    }

    if (myPlayer.getId() === this.getId()) {
      return;
    }

    if (myPlayer.isZombiePlayer()) {
      return;
    }

    if (isAutoPickupItem(this, myPlayer)) {
      return;
    }

    if (interactive.getAutoPickupEnabled()) {
      return;
    }

    const baseDisplayName = interactive.getDisplayName();
    if (!baseDisplayName || baseDisplayName.trim() === "") {
      return;
    }

    const pos = positionable.getPosition();
    const tileSize = getConfig().world.TILE_SIZE;
    const fireTileX = Math.floor(pos.x / tileSize);
    const fireTileY = Math.floor(pos.y / tileSize);
    const bind = myPlayer.getRespawnBindTile();
    const alreadyBoundHere =
      bind !== null && bind.x === fireTileX && bind.y === fireTileY;
    const displayName = alreadyBoundHere ? "craft" : baseDisplayName;

    const text = formatInteractKeyPrompt(displayName);

    const isClosest = gameState.closestInteractiveEntityId === this.getId();

    renderInteractionText(
      ctx,
      text,
      positionable.getCenterPosition(),
      positionable.getPosition(),
      myPlayer.getCenterPosition(),
      interactive.getOffset(),
      isClosest,
    );
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    const frameIndex = getFrameIndex(gameState.startedAt, {
      duration: 500,
      frames: 5,
    });
    const image = this.imageLoader.getFrameIndex(this.getType(), frameIndex);
    ctx.drawImage(image, position.x, position.y);
    super.render(ctx, gameState);
  }
}
