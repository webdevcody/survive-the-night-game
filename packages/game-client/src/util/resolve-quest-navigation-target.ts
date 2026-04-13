import type { GameState } from "@/state";
import { getEntitiesByType } from "@/state";
import { PlayerClient } from "@/entities/player";
import { ClientPositionable } from "@/extensions/positionable";
import { DialogueSurvivorNpcClient } from "@/entities/environment/dialogue-survivor-npc";
import { getConfig } from "@shared/config";
import { talkToNpcStepMatchesNpc, type QuestStep } from "@shared/map/quest-types";
import {
  getFirstActiveQuestId,
  getTrackedQuestNavigationNeed,
  type QuestNavigationTarget,
} from "@shared/quests/quest-navigation-need";

export type { QuestNavigationTarget };

export function getDialogueNpcObjectiveLabel(npc: DialogueSurvivorNpcClient): string {
  const name = npc.displayName.trim();
  if (name) {
    return name;
  }

  const key = npc.npcKey.trim();
  if (key) {
    return `the survivor at ${key}`;
  }

  return "an NPC";
}

export function findDialogueNpcForTalkStep(
  gameState: GameState,
  step: Extract<QuestStep, { type: "talk_to_npc" }>,
): DialogueSurvivorNpcClient | null {
  for (const ent of getEntitiesByType(gameState, "dialogue_survivor_npc")) {
    if (!(ent instanceof DialogueSurvivorNpcClient)) {
      continue;
    }
    if (talkToNpcStepMatchesNpc(step, ent.displayName, ent.npcKey)) {
      return ent;
    }
  }

  return null;
}

export function findDialogueNpcForQuestTurnIn(
  gameState: GameState,
  questId: string,
): DialogueSurvivorNpcClient | null {
  for (const ent of getEntitiesByType(gameState, "dialogue_survivor_npc")) {
    if (!(ent instanceof DialogueSurvivorNpcClient)) {
      continue;
    }
    const hasMatchingTurnInSession = ent.dialogueSessions.some(
      (session) => String(session.completeQuestId ?? "").trim() === questId,
    );
    if (hasMatchingTurnInSession) {
      return ent;
    }
  }

  return null;
}

export function resolveQuestNavigationTarget(
  gameState: GameState,
  player: PlayerClient | null,
): QuestNavigationTarget | null {
  if (!player || player.isZombiePlayer()) {
    return null;
  }

  const st = player.getQuestProgressPayload();
  const questId = getFirstActiveQuestId(st);
  if (!questId) {
    return null;
  }

  const def = gameState.questDataSource?.getQuestDefinition(questId);
  const need = getTrackedQuestNavigationNeed(st, def, questId);

  const TILE = getConfig().world.TILE_SIZE;

  switch (need.type) {
    case "none":
      return null;
    case "waypoint":
      return {
        worldX: (need.col + 0.5) * TILE,
        worldY: (need.row + 0.5) * TILE,
      };
    case "talk_npc": {
      const ent = findDialogueNpcForTalkStep(gameState, need.step);
      if (!ent || !ent.hasExt(ClientPositionable)) {
        return null;
      }

      const c = ent.getExt(ClientPositionable).getCenterPosition();
      return { worldX: c.x, worldY: c.y, npcEntityId: ent.getId() };
    }
    case "turn_in": {
      const ent = findDialogueNpcForQuestTurnIn(gameState, need.questId);
      if (!ent || !ent.hasExt(ClientPositionable)) {
        return null;
      }

      const c = ent.getExt(ClientPositionable).getCenterPosition();
      return { worldX: c.x, worldY: c.y, npcEntityId: ent.getId() };
    }
  }
}
