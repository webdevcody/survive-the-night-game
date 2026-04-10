import { Player } from "@/entities/players/player";
import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { IEntityManager, IMapManager } from "@/managers/types";
import { distance } from "@shared/util/physics";
import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import Inventory from "@/extensions/inventory";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import {
  stringifyPlayerQuestState,
  parsePlayerQuestState,
  emptyPlayerQuestState,
} from "@shared/quests/player-quest-state";
import {
  dialogueNpcSessionsFromSerialized,
  pickDialogueNpcSession,
} from "@shared/map/world-map-types";
import type { WorldMapDialogueNpcSession } from "@shared/map/world-map-types";
import { queuePersistQuestProgressToWebsite } from "@/util/persist-quest-progress";

function getState(player: Player): PlayerQuestStatePayload {
  return parsePlayerQuestState(player.getSerialized().get("questStateJson"));
}

function setState(player: Player, s: PlayerQuestStatePayload): void {
  player.getSerialized().set("questStateJson", stringifyPlayerQuestState(s));
  queuePersistQuestProgressToWebsite(player);
}

function mapStatToSerializedKey(stat: string): string | null {
  const m: Record<string, string> = {
    health: "statHealth",
    evade: "statEvade",
    accuracy: "statAccuracy",
    reloadSpeed: "statReloadSpeed",
    runSpeed: "statRunSpeed",
    luck: "statLuck",
    stamina: "statStamina",
    recovery: "statRecovery",
    hpRecovery: "statHpRecovery",
    strength: "statStrength",
  };
  return m[stat] ?? null;
}

function applyRewards(player: Player, def: WorldMapQuestDefinition): void {
  for (const r of def.rewards) {
    if (r.type === "permanent_stat") {
      const key = mapStatToSerializedKey(r.stat);
      if (!key) continue;
      const cur = player.getSerialized().get(key) ?? 0;
      player.getSerialized().set(key, Math.min(99, Math.floor(cur + r.amount)));
    } else if (r.type === "item") {
      const inv = player.getExt(Inventory);
      if (!inv.isFull()) {
        inv.addItem({
          itemType: r.itemType,
          state: r.count > 1 ? { count: r.count } : undefined,
        });
      }
    }
  }
  player.applyDerivedStatsFromAllocations();
}

function finishQuest(player: Player, map: IMapManager, qid: string, st: PlayerQuestStatePayload): void {
  const def = map.getQuestDefinition(qid);
  delete st.active[qid];
  if (!st.completed.includes(qid)) st.completed.push(qid);
  if (def) applyRewards(player, def);
}

function getDialogueSessionsForNpcEntity(npc: DialogueSurvivorNpc): WorldMapDialogueNpcSession[] {
  const raw = npc.getSerialized().get("dialogueSessions");
  const parsed = dialogueNpcSessionsFromSerialized(raw);
  if (parsed && parsed.length > 0) return parsed;

  const linesRaw = npc.getSerialized().get("dialogueLines");
  const lines = Array.isArray(linesRaw)
    ? linesRaw.map((l: unknown) => String(l))
    : ["…"];
  const grantRaw = npc.getSerialized().get("grantQuestId");
  const grantQuestId =
    grantRaw === null || grantRaw === undefined
      ? undefined
      : String(grantRaw).trim() || undefined;
  return [
    {
      when: { type: "always" },
      lines,
      ...(grantQuestId ? { grantQuestId } : {}),
    },
  ];
}

function pickDialogueSessionForNpcEntity(
  npc: DialogueSurvivorNpc,
  st: PlayerQuestStatePayload,
): WorldMapDialogueNpcSession {
  const sessions = getDialogueSessionsForNpcEntity(npc);
  return pickDialogueNpcSession(sessions, st);
}

export function tryGrantQuestFromNpc(player: Player, npc: DialogueSurvivorNpc, map: IMapManager): void {
  const st = getState(player);
  const session = pickDialogueSessionForNpcEntity(npc, st);
  const grant = String(session.grantQuestId ?? "").trim();
  if (!grant) return;
  const def = map.getQuestDefinition(grant);
  if (!def) return;

  if (st.completed.includes(grant) || st.active[grant] !== undefined) return;

  st.active[grant] = 0;
  setState(player, st);
}

export function tryCompleteQuestFromDialogue(
  player: Player,
  npc: DialogueSurvivorNpc,
  map: IMapManager,
): void {
  const st = getState(player);
  const session = pickDialogueSessionForNpcEntity(npc, st);
  const complete = String(session.completeQuestId ?? "").trim();
  if (!complete) return;
  const def = map.getQuestDefinition(complete);
  if (!def) return;
  finishQuest(player, map, complete, st);
  setState(player, st);
}

export function advancePickupStep(player: Player, itemType: string, map: IMapManager): void {
  const st = getState(player);
  const qids = Object.keys(st.active);
  let changed = false;
  for (const qid of qids) {
    const def = map.getQuestDefinition(qid);
    if (!def) continue;
    const idx = st.active[qid] ?? 0;
    const step = def.steps[idx];
    if (!step || step.type !== "pickup_item" || step.itemType !== itemType) continue;
    const next = idx + 1;
    if (next >= def.steps.length) {
      finishQuest(player, map, qid, st);
    } else {
      st.active[qid] = next;
    }
    changed = true;
  }
  if (changed) setState(player, st);
}

export function tickWaypointSteps(player: Player, map: IMapManager): void {
  if (!player.hasExt(Positionable)) return;
  const pos = player.getExt(Positionable).getCenterPosition();
  const TILE = getConfig().world.TILE_SIZE;
  const tx = Math.floor(pos.x / TILE);
  const ty = Math.floor(pos.y / TILE);

  const st = getState(player);
  const qids = Object.keys(st.active);
  let changed = false;
  for (const qid of qids) {
    const def = map.getQuestDefinition(qid);
    if (!def) continue;
    const idx = st.active[qid] ?? 0;
    const step = def.steps[idx];
    if (!step || step.type !== "reach_waypoint") continue;
    const radius = step.radiusTiles ?? 2;
    const distTiles = Math.max(Math.abs(tx - step.col), Math.abs(ty - step.row));
    if (distTiles > radius) continue;
    const next = idx + 1;
    if (next >= def.steps.length) {
      finishQuest(player, map, qid, st);
    } else {
      st.active[qid] = next;
    }
    changed = true;
  }
  if (changed) setState(player, st);
}

export function validateDialogueComplete(
  player: Player,
  em: IEntityManager,
  npcEntityId: number,
): DialogueSurvivorNpc | null {
  const ent = em.getEntityById(npcEntityId);
  if (!(ent instanceof DialogueSurvivorNpc)) return null;
  if (!player.hasExt(Positionable) || !ent.hasExt(Positionable)) return null;
  const d = distance(
    player.getExt(Positionable).getCenterPosition(),
    ent.getExt(Positionable).getCenterPosition(),
  );
  if (d > getConfig().player.MAX_INTERACT_RADIUS) return null;
  return ent;
}

export function initPlayerQuestState(player: Player, payload?: PlayerQuestStatePayload): void {
  player.getSerialized().set(
    "questStateJson",
    stringifyPlayerQuestState(payload ?? emptyPlayerQuestState()),
  );
}
