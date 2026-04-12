import { describe, it, expect } from "vitest";
import { countRealHumanPlayers } from "./player-session-lifecycle";
import type { IEntityManager } from "@/managers/types";
import type { Player } from "@/entities/players/player";

function mockPlayer(ai: boolean, marked: boolean): Player {
  return {
    isAIControlled: () => ai,
    isMarkedForRemoval: () => marked,
  } as Player;
}

describe("countRealHumanPlayers", () => {
  it("counts only non-AI players not marked for removal", () => {
    const em = {
      getPlayerEntities: () => [
        mockPlayer(false, false),
        mockPlayer(true, false),
        mockPlayer(false, true),
      ],
    } as IEntityManager;

    expect(countRealHumanPlayers(em)).toBe(1);
  });

  it("returns 0 for empty list", () => {
    const em = {
      getPlayerEntities: () => [],
    } as IEntityManager;

    expect(countRealHumanPlayers(em)).toBe(0);
  });
});
