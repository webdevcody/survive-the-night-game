import { Entities } from "@/constants";
import type { IGameManagers } from "@/managers/types";
import { CraftingStation } from "./crafting-station";

export class ChemistryTable extends CraftingStation {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.CHEMISTRY_TABLE, "chemistry table");
  }
}
