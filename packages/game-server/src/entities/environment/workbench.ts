import { Entities } from "@/constants";
import type { IGameManagers } from "@/managers/types";
import { CraftingStation } from "./crafting-station";

export class Workbench extends CraftingStation {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.WORKBENCH, "workbench");
  }
}
