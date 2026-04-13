import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientCarryable, ClientInteractive, ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { formatDisplayName } from "@/util/format";
import { getConfig } from "@shared/config";
import { BufferReader } from "@shared/util/buffer-serialization";
import { coerceSignMessage } from "@shared/util/sign-message";

const BLANK_SIGN_MESSAGE = "This sign is blank.";

export class SignClient extends ClientEntity implements Renderable {
  public message = "";

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.refreshMessageFromReplicatedState();
  }

  /**
   * Ground signs store text in carryable `itemState.message` (always replicated when the carryable
   * extension is dirty). The entity-level `message` field is often omitted on delta snapshots because
   * it is only set in the Sign constructor and never marked dirty on the server.
   */
  private refreshMessageFromReplicatedState(): void {
    const fromEntityField = coerceSignMessage((this as unknown as { message?: unknown }).message);
    if (fromEntityField) {
      this.message = fromEntityField;
      return;
    }
    if (this.hasExt(ClientCarryable)) {
      const fromCarryable = coerceSignMessage(this.getExt(ClientCarryable).getItemState()?.message);
      this.message = fromCarryable ?? "";
      return;
    }
    this.message = "";
  }

  public deserializeFromBuffer(reader: BufferReader): void {
    super.deserializeFromBuffer(reader);
    this.refreshMessageFromReplicatedState();
  }

  public getDisplayMessage(): string {
    const trimmed = this.message.trim();
    return trimmed.length > 0 ? trimmed : BLANK_SIGN_MESSAGE;
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (!myPlayer || myPlayer.getId() === this.getId() || myPlayer.isZombiePlayer()) {
      return;
    }

    const displayName = interactive.getDisplayName();
    if (!displayName || displayName.trim() === "") {
      return;
    }

    const text = `${formatDisplayName(displayName)} (${getConfig().keybindings.INTERACT})`;
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

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
    const positionable = this.getExt(ClientPositionable);
    const position = positionable.getPosition();
    ctx.drawImage(this.getImage(), position.x, position.y);
  }
}
