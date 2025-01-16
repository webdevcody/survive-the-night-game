import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ImageLoader } from "@/managers/asset";
import { ClientExtensionCtor } from "@/extensions/types";
import { ClientTriggerable } from "@/extensions/triggerable";
import { ClientTriggerCooldownAttacker } from "@/extensions/trigger-cooldown-attacker";
import { RawEntity } from "../../../../game-shared/src/types/entity";
import { GameState } from "@/state";
import { ClientPositionable } from "@/extensions";

export class LandmineClient extends ClientEntity implements Renderable {
  constructor(data: RawEntity, imageLoader: ImageLoader) {
    super(data, imageLoader);
  }

  public getZIndex(): number {
    return 0;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);

    const position = this.getExt(ClientPositionable).getPosition();
    const image = this.imageLoader.get("spikes");

    ctx.drawImage(image, position.x - image.width / 2, position.y - image.height / 2);
  }
}
