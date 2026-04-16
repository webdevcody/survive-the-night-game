import Positionable from "@/extensions/positionable";
import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { BaseCommand, type CommandContext } from "./base-command";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@shared/config";
import type { EntityType } from "@shared/types/entity";

const DIALOGUE_NPC_TYPE = "dialogue_survivor_npc" as EntityType;

export class TeleportCommand extends BaseCommand {
  name = "teleport";
  description = "Teleports you to the tile west of a dialogue NPC by display name";
  usage = "/teleport <npc_name>";

  execute(context: CommandContext): string | void {
    const { args, player, entityManager } = context;

    const query = args.join(" ").trim();
    if (!query) {
      return "Usage: /teleport <npc_name> — use the NPC's display name (see map / quest text).";
    }

    const npcEntities = entityManager.getEntitiesByType(DIALOGUE_NPC_TYPE);
    const queryLower = query.toLowerCase();

    const exactMatches = npcEntities.filter((ent) => {
      if (!(ent instanceof DialogueSurvivorNpc)) return false;
      const name = String(ent.getSerialized().get("displayName") ?? "").trim();
      return name.length > 0 && name.toLowerCase() === queryLower;
    });

    let target: DialogueSurvivorNpc | undefined;

    if (exactMatches.length === 1) {
      target = exactMatches[0] as DialogueSurvivorNpc;
    } else if (exactMatches.length > 1) {
      const keys = exactMatches.map((e) => String(e.getSerialized().get("npcKey") ?? "?")).join(", ");
      return `Multiple NPCs named "${query}" (npcKey: ${keys}). Use a unique name or fix the map.`;
    } else {
      const partial = npcEntities.filter((ent) => {
        if (!(ent instanceof DialogueSurvivorNpc)) return false;
        const name = String(ent.getSerialized().get("displayName") ?? "").trim();
        return name.length > 0 && name.toLowerCase().includes(queryLower);
      }) as DialogueSurvivorNpc[];

      if (partial.length === 1) {
        target = partial[0];
      } else if (partial.length === 0) {
        return `No dialogue NPC found matching "${query}".`;
      } else {
        const names = partial.map((e) => String(e.getSerialized().get("displayName") ?? "").trim());
        return `Ambiguous match for "${query}": ${names.join(", ")}. Type the full NPC name.`;
      }
    }

    const npcPos = target.getExt(Positionable).getPosition();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const dest = PoolManager.getInstance().vector2.claim(npcPos.x - TILE_SIZE, npcPos.y);
    player.setPosition(dest);
  }
}
