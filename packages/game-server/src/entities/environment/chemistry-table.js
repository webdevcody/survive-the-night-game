import { Entities } from "@/constants";
import { CraftingStation } from "./crafting-station";
export class ChemistryTable extends CraftingStation {
    constructor(gameManagers) {
        super(gameManagers, Entities.CHEMISTRY_TABLE, "chemistry table");
    }
}
