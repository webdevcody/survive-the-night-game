import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { advanceTalkStep, tryGrantQuestFromNpc, validateDialogueComplete } from "@/quests/quest-runtime";

export function onDialogueNpcComplete(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { npcEntityId: number; grantQuestOnly?: boolean },
): void {
  const player = context.players.get(socket.id);
  if (!player || data.npcEntityId == null) return;
  const npc = validateDialogueComplete(player, context.getEntityManager(), data.npcEntityId);
  if (!npc) return;
  const npcKey = String(npc.getSerialized().get("npcKey") ?? "");
  const map = context.getMapManager();

  if (data.grantQuestOnly) {
    tryGrantQuestFromNpc(player, npc, map);
    return;
  }
  advanceTalkStep(player, npcKey, map);
  tryGrantQuestFromNpc(player, npc, map);
}

export const dialogueNpcCompleteHandler: SocketEventHandler<{
  npcEntityId: number;
  grantQuestOnly?: boolean;
}> = {
  event: "DIALOGUE_NPC_COMPLETE",
  handler: (context, socket, data) => {
    const id = data?.npcEntityId;
    if (typeof id !== "number" || !Number.isInteger(id)) return;
    const grantQuestOnly = data?.grantQuestOnly === true;
    onDialogueNpcComplete(context, socket, { npcEntityId: id, grantQuestOnly });
  },
};
