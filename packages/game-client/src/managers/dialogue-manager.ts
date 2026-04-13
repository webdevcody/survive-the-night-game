import { GameState, getEntityById } from "@/state";
import { ClientPositionable } from "@/extensions/positionable";
import { DialogueSurvivorNpcClient } from "@/entities/environment/dialogue-survivor-npc";
import { MessageDecalClient } from "@/entities/environment/message-decal";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { getClosestInteractiveEntity } from "@/util/get-closest-interactive";
import { ClientEntityBase } from "@/extensions/client-entity";
import { getEntitiesByType } from "@/state";
import type { SpatialGrid } from "@shared/util/spatial-grid";

export class DialogueManager {
  private sendDialogueNpcComplete:
    | ((npcEntityId: number, acceptQuest?: boolean) => void)
    | null = null;

  public setSendDialogueNpcComplete(
    fn: (npcEntityId: number, acceptQuest?: boolean) => void,
  ): void {
    this.sendDialogueNpcComplete = fn;
  }

  public closeDialogue(gameState: GameState, npcEntityId: number, acceptQuest?: boolean): void {
    gameState.openDialogueNpcId = null;
    gameState.dialogueLineIndex = 0;
    this.sendDialogueNpcComplete?.(npcEntityId, acceptQuest);
  }

  public getOpenQuestOffer(gameState: GameState): { npcEntityId: number } | null {
    const npcEntityId = gameState.openDialogueNpcId;
    if (npcEntityId == null) return null;

    const entity = getEntityById(gameState, npcEntityId);
    if (!(entity instanceof DialogueSurvivorNpcClient)) return null;

    const lines = entity.getDialogueLines(gameState);
    if (lines.length <= 0 || gameState.dialogueLineIndex < lines.length - 1) return null;

    const questId = entity.getPendingQuestOfferId(gameState);
    if (!questId) return null;

    return { npcEntityId };
  }

  public declineOpenQuestOffer(gameState: GameState): boolean {
    const offer = this.getOpenQuestOffer(gameState);
    if (!offer) return false;

    this.closeDialogue(gameState, offer.npcEntityId, false);
    return true;
  }

  public advance(gameState: GameState): void {
    const id = gameState.openDialogueNpcId;
    if (id == null) return;
    const openEnt = getEntityById(gameState, id);
    if (!openEnt) return;

    if (openEnt.getType() === "message_decal") {
      const sign = openEnt as MessageDecalClient;
      const lines = sign.getMessageLines();
      const total = lines.length;
      const idx = gameState.dialogueLineIndex;
      if (total === 0) {
        gameState.openDialogueNpcId = null;
        gameState.dialogueLineIndex = 0;
        return;
      }
      if (idx < total - 1) {
        gameState.dialogueLineIndex++;
        return;
      }
      gameState.openDialogueNpcId = null;
      gameState.dialogueLineIndex = 0;
      return;
    }

    if (openEnt.getType() !== "dialogue_survivor_npc") return;
    const npc = openEnt as DialogueSurvivorNpcClient;
    const lines = npc.getDialogueLines(gameState);
    const total = lines.length;
    const idx = gameState.dialogueLineIndex;

    if (total === 0) {
      this.closeDialogue(gameState, id);
      return;
    }

    if (idx < total - 1) {
      gameState.dialogueLineIndex++;
      return;
    }

    const questOfferId = npc.getPendingQuestOfferId(gameState);
    if (questOfferId) {
      this.closeDialogue(gameState, id, true);
      return;
    }

    this.closeDialogue(gameState, id);
  }

  /**
   * Try to open a dialogue with the closest NPC or message decal.
   * Returns true if a dialogue was opened.
   */
  public tryOpenDialogue(
    gameState: GameState,
    playerEntity: ClientEntityBase,
    spatialGrid: SpatialGrid<ClientEntityBase> | null,
  ): boolean {
    const maxInteract = getConfig().player.MAX_INTERACT_RADIUS;

    // Check if we should advance an already-open dialogue
    if (gameState.openDialogueNpcId != null) {
      return false; // Handled by the caller (advance)
    }

    // Find closest dialogue entity
    let closest = getClosestInteractiveEntity(gameState, spatialGrid);
    if (!closest && spatialGrid === null) {
      let bestDist = Infinity;
      let best: ClientEntityBase | null = null;
      for (const e of getEntitiesByType(gameState, "dialogue_survivor_npc")) {
        if (!e.hasExt(ClientPositionable) || !playerEntity.hasExt(ClientPositionable)) continue;
        const d = distance(
          playerEntity.getExt(ClientPositionable).getCenterPosition(),
          e.getExt(ClientPositionable).getCenterPosition(),
        );
        if (d <= maxInteract && d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      for (const e of getEntitiesByType(gameState, "message_decal")) {
        if (!e.hasExt(ClientPositionable) || !playerEntity.hasExt(ClientPositionable)) continue;
        const d = distance(
          playerEntity.getExt(ClientPositionable).getCenterPosition(),
          e.getExt(ClientPositionable).getCenterPosition(),
        );
        if (d <= maxInteract && d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      closest = best;
    }

    if (
      (closest?.getType() === "dialogue_survivor_npc" ||
        closest?.getType() === "message_decal") &&
      closest.hasExt(ClientPositionable) &&
      playerEntity.hasExt(ClientPositionable)
    ) {
      const d = distance(
        playerEntity.getExt(ClientPositionable).getCenterPosition(),
        closest.getExt(ClientPositionable).getCenterPosition(),
      );
      if (d <= maxInteract) {
        gameState.openDialogueNpcId = closest.getId();
        gameState.dialogueLineIndex = 0;
        return true;
      }
    }

    return false;
  }
}
