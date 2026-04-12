import { Entities } from "@/constants";
import { CraftingStation } from "./crafting-station";
export class Workbench extends CraftingStation {
    constructor(gameManagers) {
        super(gameManagers, Entities.WORKBENCH, "workbench");
    }
}
