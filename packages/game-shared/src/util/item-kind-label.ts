import { itemRegistry, type ArmorEquipmentSlotKey } from "../entities/item-registry";
import { resourceRegistry } from "../entities/resource-registry";
import { weaponRegistry } from "../entities/weapon-registry";

const ARMOR_SLOT_LABEL: Record<ArmorEquipmentSlotKey, string> = {
  head: "Head gear",
  shoulders: "Shoulder armor",
  torso: "Body armor",
  legs: "Leg armor",
  shoes: "Footwear",
  back: "Back",
  hands: "Hand gear",
};

const ITEM_CATEGORY_LABEL: Record<
  "consumable" | "ammo" | "placeable" | "throwable" | "structure",
  string
> = {
  consumable: "Consumable",
  ammo: "Ammo",
  placeable: "Placeable",
  throwable: "Throwable",
  structure: "Structure",
};

const WEAPON_SLOT_BASE: Record<"primary" | "secondary" | "melee", string> = {
  primary: "Primary weapon",
  secondary: "Secondary weapon",
  melee: "Melee weapon",
};

/**
 * Player-facing category for inventory / bank / shop hover tooltips.
 * Precedence: resource registry → weapon registry → item registry (coin override) → fallback.
 */
export function getItemKindLabel(itemType: string): string {
  if (resourceRegistry.has(itemType)) {
    return "Resource";
  }

  const weapon = weaponRegistry.get(itemType);
  if (weapon) {
    const base = WEAPON_SLOT_BASE[weapon.loadoutSlot];
    const t = weapon.type;
    if (t === "ranged") {
      return `${base} · Ranged`;
    }
    if (t === "melee" && weapon.loadoutSlot !== "melee") {
      return `${base} · Melee`;
    }
    return base;
  }

  if (itemType === "coin") {
    return "Currency";
  }

  const cfg = itemRegistry.get(itemType);
  if (cfg) {
    if (cfg.category === "armor") {
      const slot = cfg.equipmentSlot;
      if (slot) {
        return ARMOR_SLOT_LABEL[slot];
      }
      return "Armor";
    }
    return ITEM_CATEGORY_LABEL[cfg.category];
  }

  return "Item";
}
