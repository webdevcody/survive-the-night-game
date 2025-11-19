import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientPositionable } from "@/extensions/positionable";
import { ClientInteractive } from "@/extensions/interactive";
import { GameState } from "@/state";
import { Renderable } from "@/entities/util";

export class NoteClient extends ClientEntityBase implements Renderable {
    public title: string = "";
    public content: string = "";

    public getZIndex(): number {
        return this.getExt(ClientPositionable).getPosition().y;
    }

    public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
        const positionable = this.getExt(ClientPositionable);
        const position = positionable.getPosition();
        const image = this.getImage();

        if (image) {
            ctx.drawImage(image, position.x, position.y);
        }

        // Render interaction prompt if this is the closest interactive entity
        if (gameState.closestInteractiveEntityId === this.getId()) {
            const interactive = this.getExt(ClientInteractive);
            const offset = interactive.getOffset();

            ctx.save();
            ctx.font = "12px Arial";
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.textAlign = "center";

            const text = `[E] Read ${interactive.getDisplayName()}`;
            const textX = position.x + 8 + offset.x; // Center of 16px sprite
            const textY = position.y - 10 + offset.y;

            ctx.strokeText(text, textX, textY);
            ctx.fillText(text, textX, textY);
            ctx.restore();
        }
    }
}
