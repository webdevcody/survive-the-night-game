import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import {
  tryCompleteQuestFromDialogue,
  tryGrantQuestFromNpc,
  tryHealPlayerFromDialogueSession,
  validateDialogueComplete,
} from "@/quests/quest-runtime";

export function onDialogueNpcComplete(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { npcEntityId: number },
): void {
  const player = context.players.get(socket.id);
  if (!player || data.npcEntityId == null) return;
  const npc = validateDialogueComplete(player, context.getEntityManager(), data.npcEntityId);
  if (!npc) return;
  const map = context.getMapManager();

  tryGrantQuestFromNpc(player, npc, map);
  tryCompleteQuestFromDialogue(player, npc, map);
  tryHealPlayerFromDialogueSession(player, npc);
}

export const dialogueNpcCompleteHandler: SocketEventHandler<{
  npcEntityId: number;
}> = {
  event: "DIALOGUE_NPC_COMPLETE",
  handler: (context, socket, data) => {
    const id = data?.npcEntityId;
    if (typeof id !== "number" || !Number.isInteger(id)) return;
    onDialogueNpcComplete(context, socket, { npcEntityId: id });
  },
};
