import { Player } from "@/entities/players/player";
import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { IEntityManager, IMapManager } from "@/managers/types";
import type { EntityType } from "@shared/types/entity";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
/** Run before grant/complete on dialogue end so held items advance pickup steps without same-frame quest completion. */
export declare function trySyncActiveQuestPickupStepsWithInventory(player: Player, map: IMapManager): void;
export declare function tryGrantQuestFromNpc(player: Player, npc: DialogueSurvivorNpc, map: IMapManager): string | null;
export declare function tryCompleteQuestFromDialogue(player: Player, npc: DialogueSurvivorNpc, map: IMapManager): void;
/** Advances active quests whose current step is `talk_to_npc` matching this NPC (after dialogue ends). */
export declare function tryAdvanceTalkToNpcStep(player: Player, npc: DialogueSurvivorNpc, map: IMapManager, opts?: {
    skipQuestIds?: Set<string>;
}): void;
export declare function tryHealPlayerFromDialogueSession(player: Player, npc: DialogueSurvivorNpc, map: IMapManager): void;
export declare function advancePickupStep(player: Player, itemType: string, map: IMapManager): void;
export declare function recordKillQuestProgress(player: Player, enemyType: EntityType, map: IMapManager): void;
export declare function tickWaypointSteps(player: Player, map: IMapManager): void;
export declare function validateDialogueComplete(player: Player, em: IEntityManager, npcEntityId: number): DialogueSurvivorNpc | null;
export declare function initPlayerQuestState(player: Player, payload?: PlayerQuestStatePayload): void;
/**
 * After a map reload (/restart or editor reload), drop quest progress that no longer exists on the map
 * so clients receive definitions and journal state that match {@link IMapManager#getMapData}.
 */
export declare function reconcilePlayerQuestStateWithMap(player: Player, map: IMapManager): void;
