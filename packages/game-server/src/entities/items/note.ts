import { Entity } from "../entity";
import { IGameManagers } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import { EntityCategories } from "@shared/entities";
import PoolManager from "@shared/util/pool-manager";

export class Note extends Entity {
    public get title(): string {
        return this.serialized.get("title");
    }

    public set title(value: string) {
        this.serialized.set("title", value);
    }

    public get content(): string {
        return this.serialized.get("content");
    }

    public set content(value: string) {
        this.serialized.set("content", value);
    }

    constructor(gameManagers: IGameManagers) {
        super(gameManagers, "note");

        this.serialized.set("title", "");
        this.serialized.set("content", "");

        const positionable = new Positionable(this);
        positionable.setSize(PoolManager.getInstance().vector2.claim(16, 16));
        this.addExtension(positionable);

        const interactive = new Interactive(this);
        interactive.setDisplayName("Note");
        this.addExtension(interactive);
    }

    public getCategory() {
        return EntityCategories.ITEM;
    }
}
