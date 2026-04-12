import { tryAdvanceTalkToNpcStep, tryCompleteQuestFromDialogue, tryGrantQuestFromNpc, tryHealPlayerFromDialogueSession, trySyncActiveQuestPickupStepsWithInventory, validateDialogueComplete, } from "@/quests/quest-runtime";
export function onDialogueNpcComplete(context, socket, data) {
    const player = context.players.get(socket.id);
    if (!player || data.npcEntityId == null)
        return;
    const npc = validateDialogueComplete(player, context.getEntityManager(), data.npcEntityId);
    if (!npc)
        return;
    const map = context.getMapManager();
    trySyncActiveQuestPickupStepsWithInventory(player, map);
    const newlyGrantedQuestId = tryGrantQuestFromNpc(player, npc, map, data.acceptQuest !== false);
    tryAdvanceTalkToNpcStep(player, npc, map, newlyGrantedQuestId ? { skipQuestIds: new Set([newlyGrantedQuestId]) } : undefined);
    tryCompleteQuestFromDialogue(player, npc, map);
    tryHealPlayerFromDialogueSession(player, npc, map);
}
export const dialogueNpcCompleteHandler = {
    event: "DIALOGUE_NPC_COMPLETE",
    handler: (context, socket, data) => {
        const id = data === null || data === void 0 ? void 0 : data.npcEntityId;
        if (typeof id !== "number" || !Number.isInteger(id))
            return;
        if ((data === null || data === void 0 ? void 0 : data.acceptQuest) !== undefined && typeof data.acceptQuest !== "boolean")
            return;
        onDialogueNpcComplete(context, socket, {
            npcEntityId: id,
            acceptQuest: data === null || data === void 0 ? void 0 : data.acceptQuest,
        });
    },
};
