import { getEntitiesByType, type GameState } from "../state";
import type { PlayerClient } from "../entities/player";
import { DialogueSurvivorNpcClient } from "../entities/environment/dialogue-survivor-npc";
import { ClientPositionable } from "../extensions/positionable";
import type { WorldMapQuestDefinition } from "../../../game-shared/src/map/quest-types";
import {
  resolvePrimaryQuestTracker,
  type QuestTrackerNpcCandidate,
} from "./quest-tracker-target";

function getQuestTrackerCompletionIds(
  dialogueSessions: readonly { completeQuestId?: string | null }[],
): string[] {
  const ids = new Set<string>();
  for (const session of dialogueSessions) {
    const questId = String(session.completeQuestId ?? "").trim();
    if (!questId) continue;
    ids.add(questId);
  }
  return [...ids];
}

export function collectQuestTrackerNpcCandidates(gameState: GameState): QuestTrackerNpcCandidate[] {
  const out: QuestTrackerNpcCandidate[] = [];
  for (const entity of getEntitiesByType(gameState, "dialogue_survivor_npc")) {
    if (!(entity instanceof DialogueSurvivorNpcClient)) continue;
    if (!entity.hasExt(ClientPositionable)) continue;
    const position = entity.getExt(ClientPositionable).getCenterPosition();
    const completesQuestIds = getQuestTrackerCompletionIds(entity.dialogueSessions);
    out.push({
      displayName: entity.displayName.trim(),
      npcKey: entity.npcKey.trim(),
      worldX: position.x,
      worldY: position.y,
      ...(completesQuestIds.length > 0 ? { completesQuestIds } : {}),
    });
  }
  return out;
}

export function resolvePrimaryQuestTrackerForPlayer(
  gameState: GameState,
  player: PlayerClient | null,
  quests: readonly WorldMapQuestDefinition[],
  progress: unknown,
) {
  if (!player || !player.hasExt(ClientPositionable)) {
    return null;
  }
  const position = player.getExt(ClientPositionable).getCenterPosition();
  const npcCandidates = collectQuestTrackerNpcCandidates(gameState);
  return resolvePrimaryQuestTracker(
    quests,
    progress as any,
    position.x,
    position.y,
    npcCandidates,
  );
}
