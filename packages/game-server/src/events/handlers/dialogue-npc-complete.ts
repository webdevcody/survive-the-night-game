import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import {
  tryAdvanceTalkToNpcStep,
  tryCompleteQuestFromDialogue,
  tryGrantQuestFromNpc,
  tryHealPlayerFromDialogueSession,
  trySyncActiveQuestPickupStepsWithInventory,
  validateDialogueComplete,
} from "@/quests/quest-runtime";

export function onDialogueNpcComplete(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { npcEntityId: number; acceptQuest?: boolean },
): void {
  const player = context.players.get(socket.id);
  if (!player || data.npcEntityId == null) return;
  const npc = validateDialogueComplete(player, context.getEntityManager(), data.npcEntityId);
  if (!npc) return;
  const map = context.getMapManager();

  trySyncActiveQuestPickupStepsWithInventory(player, map);
  const newlyGrantedQuestId = tryGrantQuestFromNpc(player, npc, map, data.acceptQuest !== false);
  tryAdvanceTalkToNpcStep(
    player,
    npc,
    map,
    newlyGrantedQuestId ? { skipQuestIds: new Set([newlyGrantedQuestId]) } : undefined,
  );
  tryCompleteQuestFromDialogue(player, npc, map);
  tryHealPlayerFromDialogueSession(player, npc, map);
}

export const dialogueNpcCompleteHandler: SocketEventHandler<{
  npcEntityId: number;
  acceptQuest?: boolean;
}> = {
  event: "DIALOGUE_NPC_COMPLETE",
  handler: (context, socket, data) => {
    const id = data?.npcEntityId;
    if (typeof id !== "number" || !Number.isInteger(id)) return;
    if (data?.acceptQuest !== undefined && typeof data.acceptQuest !== "boolean") return;
    onDialogueNpcComplete(context, socket, {
      npcEntityId: id,
      acceptQuest: data?.acceptQuest,
    });
  },
};
