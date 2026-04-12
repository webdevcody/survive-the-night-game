import { Entities } from "@/constants";
import { CraftingStation } from "./crafting-station";
export class Forge extends CraftingStation {
    constructor(gameManagers) {
        super(gameManagers, Entities.FORGE, "forge");
    }
}
