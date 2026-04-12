import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useEditorStore } from "../-store";
import type {
  QuestStep,
  QuestReward,
  QuestCompletionType,
  WorldMapQuestDefinition,
} from "@survive-the-night/game-shared/map/quest-types";
import { QUEST_KILL_ENEMIES_COUNT_MAX } from "@survive-the-night/game-shared/map/quest-types";
import { ENTITY_REGISTRATION_CONFIG } from "@survive-the-night/game-shared/config/entity-registration";
import type { EntityType } from "@survive-the-night/game-shared/types/entity";
import { ITEM_FIXTURE_SPAWN_TYPES } from "@survive-the-night/game-shared/map/spawn-palette";
import type { WorldMapDialogueNpcEntry } from "@survive-the-night/game-shared/map/world-map-types";
import { getMapSideLength } from "../-utils";

function talkStepSelectValue(
  step: Extract<QuestStep, { type: "talk_to_npc" }>,
  npcs: WorldMapDialogueNpcEntry[],
): string {
  const key = step.npcKey?.trim();
  if (key && npcs.some((e) => `${e.row},${e.col}` === key)) return key;
  const name = step.npcName?.trim();
  if (name) {
    const hit = npcs.find((e) => (e.name?.trim() ?? "") === name);
    if (hit) return `${hit.row},${hit.col}`;
  }
  return "";
}

function sortDialogueNpcs(npcs: WorldMapDialogueNpcEntry[]): WorldMapDialogueNpcEntry[] {
  return [...npcs].sort((a, b) => a.row - b.row || a.col - b.col);
}

const STAT_OPTIONS = [
  "health",
  "evade",
  "accuracy",
  "reloadSpeed",
  "runSpeed",
  "luck",
  "stamina",
  "recovery",
  "hpRecovery",
  "strength",
] as const;

const PICKUP_TYPES = ITEM_FIXTURE_SPAWN_TYPES as readonly EntityType[];

const QUEST_KILL_ENEMY_TYPES = ENTITY_REGISTRATION_CONFIG.filter(
  (e) => e.category === "zombies",
).map((e) => e.type) as EntityType[];

type QuestRewardListKey = "rewards" | "startRewards";

const REWARD_SECTIONS: { key: QuestRewardListKey; label: string }[] = [
  { key: "startRewards", label: "Rewards on start" },
  { key: "rewards", label: "Rewards on complete" },
];

export function QuestsEditorPanel() {
  const quests = useEditorStore((state) => state.quests);
  const setQuests = useEditorStore((state) => state.setQuests);
  const createQuestDraft = useEditorStore((state) => state.createQuestDraft);
  const focusedQuestId = useEditorStore((state) => state.focusedQuestId);
  const setFocusedQuestId = useEditorStore((state) => state.setFocusedQuestId);
  const groundGrid = useEditorStore((state) => state.groundGrid);
  const dialogueNpcs = useEditorStore((state) => state.dialogueNpcs);
  const questWaypointPickTarget = useEditorStore((state) => state.questWaypointPickTarget);
  const startQuestWaypointPick = useEditorStore((state) => state.startQuestWaypointPick);
  const cancelQuestWaypointPick = useEditorStore((state) => state.cancelQuestWaypointPick);
  const [openQuestIds, setOpenQuestIds] = useState<string[]>([]);

  const mapSide = getMapSideLength(groundGrid);
  const sortedMapNpcs = useMemo(() => sortDialogueNpcs(dialogueNpcs), [dialogueNpcs]);

  const sortedQuests = useMemo(
    () =>
      [...quests].sort((a, b) => {
        const byTitle = a.title
          .trim()
          .localeCompare(b.title.trim(), undefined, { sensitivity: "base" });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      }),
    [quests],
  );

  useEffect(() => {
    if (!focusedQuestId) return;
    setOpenQuestIds((current) =>
      current.includes(focusedQuestId) ? current : [...current, focusedQuestId],
    );
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document
        .getElementById(`editor-quest-${focusedQuestId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [focusedQuestId]);

  useEffect(() => {
    setOpenQuestIds((current) => current.filter((id) => quests.some((quest) => quest.id === id)));
  }, [quests]);

  const updateQuest = (id: string, patch: Partial<Omit<WorldMapQuestDefinition, "id">>) => {
    setQuests(quests.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuest = (id: string) => {
    if (questWaypointPickTarget?.questId === id) cancelQuestWaypointPick();
    setQuests(quests.filter((q) => q.id !== id));
  };

  const updateStep = (questId: string, stepIndex: number, step: QuestStep) => {
    setQuests(
      quests.map((q) => {
        if (q.id !== questId) return q;
        const steps = q.steps.map((s, i) => (i === stepIndex ? step : s));
        return { ...q, steps };
      }),
    );
  };

  const removeStep = (questId: string, stepIndex: number) => {
    if (questWaypointPickTarget?.questId === questId) cancelQuestWaypointPick();
    setQuests(
      quests.map((q) =>
        q.id === questId ? { ...q, steps: q.steps.filter((_, i) => i !== stepIndex) } : q,
      ),
    );
  };

  const addStep = (questId: string, type: QuestStep["type"]) => {
    let step: QuestStep;
    if (type === "pickup_item") {
      step = { type: "pickup_item", itemType: "torch" as EntityType };
    } else if (type === "reach_waypoint") {
      step = { type: "reach_waypoint", row: 0, col: 0, radiusTiles: 2 };
    } else if (type === "kill_enemies") {
      const enemyType = QUEST_KILL_ENEMY_TYPES[0] ?? ("zombie" as EntityType);
      step = { type: "kill_enemies", enemyType, count: 5 };
    } else {
      const first = sortedMapNpcs[0];
      step = first
        ? {
            type: "talk_to_npc",
            npcKey: `${first.row},${first.col}`,
            ...(first.name?.trim() ? { npcName: first.name.trim() } : {}),
          }
        : { type: "talk_to_npc" };
    }
    setQuests(quests.map((q) => (q.id === questId ? { ...q, steps: [...q.steps, step] } : q)));
  };

  const updateReward = (
    questId: string,
    listKey: QuestRewardListKey,
    rewardIndex: number,
    reward: QuestReward,
  ) => {
    setQuests(
      quests.map((q) => {
        if (q.id !== questId) return q;
        const list = q[listKey].map((r, i) => (i === rewardIndex ? reward : r));
        return { ...q, [listKey]: list };
      }),
    );
  };

  const removeReward = (questId: string, listKey: QuestRewardListKey, rewardIndex: number) => {
    setQuests(
      quests.map((q) =>
        q.id === questId
          ? { ...q, [listKey]: q[listKey].filter((_, i) => i !== rewardIndex) }
          : q,
      ),
    );
  };

  const addReward = (questId: string, listKey: QuestRewardListKey, type: QuestReward["type"]) => {
    const reward: QuestReward =
      type === "permanent_stat"
        ? { type: "permanent_stat", stat: "health", amount: 1 }
        : type === "experience"
          ? { type: "experience", amount: 50 }
          : { type: "item", itemType: "bandage" as EntityType, count: 1 };
    setQuests(
      quests.map((q) =>
        q.id === questId ? { ...q, [listKey]: [...q[listKey], reward] } : q,
      ),
    );
  };

  return (
    <div className="space-y-3 text-white">
      <div className="rounded border border-gray-600/80 bg-gray-950/50 px-2 py-2">
        <p className="text-[11px] font-medium text-gray-200">Quest definitions</p>
        <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
          Saved with the world map when you use Save under Map file.
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-300">Quests</p>
        <Button
          size="sm"
          className="!h-7 !text-[10px]"
          onClick={() => createQuestDraft()}
          type="button"
        >
          Add quest
        </Button>
      </div>
      {quests.length === 0 ? (
        <p className="text-[10px] text-gray-500">No quests yet. Add one for NPCs to grant.</p>
      ) : (
        <Accordion
          type="multiple"
          value={openQuestIds}
          onValueChange={(value) => {
            setOpenQuestIds(value);
            if (focusedQuestId && !value.includes(focusedQuestId)) {
              setFocusedQuestId(null);
            }
          }}
          className="max-h-[70vh] overflow-y-auto rounded border border-indigo-800/80 bg-gray-900/80 pr-1"
        >
          {sortedQuests.map((q) => (
            <AccordionItem
              key={q.id}
              id={`editor-quest-${q.id}`}
              value={q.id}
              className={`border-gray-700/60 px-2 ${
                focusedQuestId === q.id ? "bg-indigo-950/40 ring-1 ring-indigo-500/60" : ""
              }`}
            >
              <AccordionTrigger className="py-2.5 text-xs text-gray-100 hover:no-underline [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-gray-400">
                <span className="block truncate pr-2 text-left">
                  {focusedQuestId === q.id ? (
                    <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-indigo-300">
                      Selected from NPC editor
                    </span>
                  ) : null}
                  <span className="font-medium">{q.title.trim() || "Untitled quest"}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3 pt-0 text-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/50 pb-2">
                  <p className="font-mono text-[10px] text-gray-400">
                    id: <span className="text-gray-200">{q.id}</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[10px]"
                    onClick={() => removeQuest(q.id)}
                  >
                    Delete
                  </Button>
                </div>
                <label className="text-[10px] text-gray-400">Title</label>
                <input
                  className="mb-2 w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px]"
                  value={q.title}
                  onChange={(e) => updateQuest(q.id, { title: e.target.value })}
                />
                <label className="text-[10px] text-gray-400">Completion</label>
                <select
                  className="mb-2 w-full rounded border border-gray-600 bg-gray-950 px-2 py-1 text-[11px]"
                  value={(q.completionType ?? "dialogue_npc") as QuestCompletionType}
                  onChange={(e) => {
                    const v = e.target.value as QuestCompletionType;
                    updateQuest(q.id, {
                      completionType: v === "dialogue_npc" ? undefined : v,
                    });
                  }}
                >
                  <option value="dialogue_npc">
                    Turn in via NPC dialogue (completeQuestId on a session)
                  </option>
                  <option value="final_step">Auto-complete when the last step is done</option>
                </select>
                <p className="mb-2 text-[9px] leading-snug text-gray-500">
                  Auto-complete grants &quot;Rewards on complete&quot; immediately after the final
                  objective; you do not need an NPC session with completeQuestId.
                </p>
                <p className="mb-1 text-[10px] font-medium text-gray-300">Steps</p>
                <div className="mb-2 space-y-2">
                  {q.steps.map((s, i) => (
                    <div key={i} className="rounded border border-gray-700 bg-gray-950/80 p-1.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] uppercase text-gray-500">Step {i + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="!h-5 !min-h-0 !px-1 !text-[9px]"
                          onClick={() => removeStep(q.id, i)}
                        >
                          Remove
                        </Button>
                      </div>
                      {s.type === "pickup_item" ? (
                        <select
                          className="w-full rounded border border-gray-600 bg-gray-900 text-[10px]"
                          value={s.itemType}
                          onChange={(e) =>
                            updateStep(q.id, i, {
                              type: "pickup_item",
                              itemType: e.target.value as EntityType,
                            })
                          }
                        >
                          {PICKUP_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {s.type === "reach_waypoint" ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="number"
                              className="w-16 rounded border border-gray-600 bg-gray-900 text-[10px]"
                              min={0}
                              max={mapSide - 1}
                              aria-label="Waypoint row"
                              value={s.row}
                              onChange={(e) =>
                                updateStep(q.id, i, {
                                  ...s,
                                  row: Math.max(
                                    0,
                                    Math.min(mapSide - 1, parseInt(e.target.value, 10) || 0),
                                  ),
                                })
                              }
                            />
                            <input
                              type="number"
                              className="w-16 rounded border border-gray-600 bg-gray-900 text-[10px]"
                              min={0}
                              max={mapSide - 1}
                              aria-label="Waypoint column"
                              value={s.col}
                              onChange={(e) =>
                                updateStep(q.id, i, {
                                  ...s,
                                  col: Math.max(
                                    0,
                                    Math.min(mapSide - 1, parseInt(e.target.value, 10) || 0),
                                  ),
                                })
                              }
                            />
                            <input
                              type="number"
                              className="w-14 rounded border border-gray-600 bg-gray-900 text-[10px]"
                              title="radius tiles"
                              min={1}
                              max={8}
                              value={s.radiusTiles ?? 2}
                              onChange={(e) =>
                                updateStep(q.id, i, {
                                  ...s,
                                  radiusTiles: Math.max(
                                    1,
                                    Math.min(8, parseInt(e.target.value, 10) || 2),
                                  ),
                                })
                              }
                            />
                            {questWaypointPickTarget?.questId === q.id &&
                            questWaypointPickTarget.stepIndex === i ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="!h-6 !text-[9px]"
                                onClick={() => cancelQuestWaypointPick()}
                              >
                                Cancel pick
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="!h-6 !text-[9px]"
                                onClick={() => startQuestWaypointPick(q.id, i)}
                              >
                                Target
                              </Button>
                            )}
                          </div>
                          <p className="text-[9px] leading-snug text-gray-500">
                            Row and column are map tile indices. Use Target, then click the map.
                          </p>
                        </div>
                      ) : null}
                      {s.type === "kill_enemies" ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            className="min-w-0 flex-1 rounded border border-gray-600 bg-gray-900 text-[10px]"
                            value={s.enemyType}
                            onChange={(e) =>
                              updateStep(q.id, i, {
                                type: "kill_enemies",
                                enemyType: e.target.value as EntityType,
                                count: s.count,
                              })
                            }
                          >
                            {QUEST_KILL_ENEMY_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            className="w-16 rounded border border-gray-600 bg-gray-900 text-[10px]"
                            title="Kill count"
                            min={1}
                            max={QUEST_KILL_ENEMIES_COUNT_MAX}
                            value={s.count}
                            onChange={(e) =>
                              updateStep(q.id, i, {
                                type: "kill_enemies",
                                enemyType: s.enemyType,
                                count: Math.max(
                                  1,
                                  Math.min(
                                    QUEST_KILL_ENEMIES_COUNT_MAX,
                                    parseInt(e.target.value, 10) || 1,
                                  ),
                                ),
                              })
                            }
                          />
                        </div>
                      ) : null}
                      {s.type === "talk_to_npc" ? (
                        <div className="space-y-1">
                          <label className="block text-[9px] text-gray-500">Talk to</label>
                          <select
                            className="w-full rounded border border-gray-600 bg-gray-900 px-1.5 py-1 text-[10px]"
                            value={talkStepSelectValue(s, sortedMapNpcs)}
                            disabled={sortedMapNpcs.length === 0}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              if (!v) {
                                updateStep(q.id, i, { type: "talk_to_npc" });
                                return;
                              }
                              const [rs, cs] = v.split(",");
                              const row = parseInt(rs ?? "", 10);
                              const col = parseInt(cs ?? "", 10);
                              const entry = dialogueNpcs.find(
                                (n) => n.row === row && n.col === col,
                              );
                              updateStep(q.id, i, {
                                type: "talk_to_npc",
                                npcKey: v,
                                ...(entry?.name?.trim() ? { npcName: entry.name.trim() } : {}),
                              });
                            }}
                          >
                            <option value="">
                              {sortedMapNpcs.length
                                ? "Select NPC…"
                                : "No dialogue NPCs — add one on the map"}
                            </option>
                            {sortedMapNpcs.map((e) => {
                              const val = `${e.row},${e.col}`;
                              const label = e.name?.trim()
                                ? `${e.name.trim()} (row ${e.row}, col ${e.col})`
                                : `Unnamed (row ${e.row}, col ${e.col})`;
                              return (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-[9px] leading-snug text-gray-500">
                            Completes when the player finishes that NPC&apos;s dialogue (after all
                            lines).
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "pickup_item")}
                  >
                    + Pickup
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "reach_waypoint")}
                  >
                    + Waypoint
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "kill_enemies")}
                  >
                    + Kill enemies
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="!h-6 !text-[9px]"
                    onClick={() => addStep(q.id, "talk_to_npc")}
                  >
                    + Talk to NPC
                  </Button>
                </div>
                {REWARD_SECTIONS.map(({ key: listKey, label }) => (
                  <div key={listKey} className="space-y-1">
                    <p className="mb-1 text-[10px] font-medium text-gray-300">{label}</p>
                    <div className="space-y-2">
                      {q[listKey].map((r, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-1 rounded border border-gray-700 bg-gray-950/80 p-1"
                        >
                          {r.type === "permanent_stat" ? (
                            <>
                              <select
                                className="rounded border border-gray-600 bg-gray-900 text-[10px]"
                                value={r.stat}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "permanent_stat",
                                    stat: e.target.value,
                                    amount: r.amount,
                                  })
                                }
                              >
                                {STAT_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="w-12 rounded border border-gray-600 bg-gray-900 text-[10px]"
                                min={1}
                                max={99}
                                value={r.amount}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "permanent_stat",
                                    stat: r.stat,
                                    amount: Math.max(
                                      1,
                                      Math.min(99, parseInt(e.target.value, 10) || 1),
                                    ),
                                  })
                                }
                              />
                            </>
                          ) : r.type === "experience" ? (
                            <>
                              <span className="text-[10px] text-gray-400">XP</span>
                              <input
                                type="number"
                                className="w-20 rounded border border-gray-600 bg-gray-900 text-[10px]"
                                min={1}
                                max={1_000_000}
                                value={r.amount}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "experience",
                                    amount: Math.max(
                                      1,
                                      Math.min(1_000_000, parseInt(e.target.value, 10) || 1),
                                    ),
                                  })
                                }
                              />
                            </>
                          ) : (
                            <>
                              <select
                                className="rounded border border-gray-600 bg-gray-900 text-[10px]"
                                value={r.itemType}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "item",
                                    itemType: e.target.value as EntityType,
                                    count: r.count,
                                  })
                                }
                              >
                                {PICKUP_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="w-10 rounded border border-gray-600 bg-gray-900 text-[10px]"
                                min={1}
                                max={99}
                                value={r.count}
                                onChange={(e) =>
                                  updateReward(q.id, listKey, i, {
                                    type: "item",
                                    itemType: r.itemType,
                                    count: Math.max(
                                      1,
                                      Math.min(99, parseInt(e.target.value, 10) || 1),
                                    ),
                                  })
                                }
                              />
                            </>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="!h-5 !px-1 !text-[9px]"
                            onClick={() => removeReward(q.id, listKey, i)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!h-6 !text-[9px]"
                        onClick={() => addReward(q.id, listKey, "permanent_stat")}
                      >
                        + Stat
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!h-6 !text-[9px]"
                        onClick={() => addReward(q.id, listKey, "item")}
                      >
                        + Item
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="!h-6 !text-[9px]"
                        onClick={() => addReward(q.id, listKey, "experience")}
                      >
                        + XP
                      </Button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
