import { GameMaster } from "./game-master";
import { EntityManager } from "./entity-manager";
import { Player } from "@/entities/player";
import { beforeEach, it, expect, describe } from "vitest";
import { simpleTestSetup } from "@/tests/utils/setup";
import { GameManagers } from "./game-managers";

let gameMaster: GameMaster;
let gameManagers: GameManagers;
let entityManager: EntityManager;

beforeEach(() => {
  gameManagers = simpleTestSetup();
  entityManager = gameManagers.getEntityManager() as EntityManager;
  gameMaster = new GameMaster(gameManagers);
});

describe("getNumberOfZombies", () => {
  describe("with 1 player", () => {
    beforeEach(() => {
      const player = new Player(gameManagers);
      entityManager.addEntity(player);
    });

    it("should return correct zombie counts for night 1", () => {
      const result = gameMaster.getNumberOfZombies(1);
      expect(result.total).toBe(10); // MIN_TOTAL_ZOMBIES
      expect(result.regular).toBe(10);
      expect(result.fast).toBe(0);
      expect(result.big).toBe(0);
    });

    it("should return correct zombie counts for night 2", () => {
      const result = gameMaster.getNumberOfZombies(2);
      expect(result.total).toBe(14); // MIN_TOTAL_ZOMBIES
      expect(result.regular).toBe(14);
      expect(result.fast).toBe(0);
      expect(result.big).toBe(0);
    });

    it("should introduce fast zombies on night 3", () => {
      const result = gameMaster.getNumberOfZombies(3);
      expect(result.total).toBe(22); // MIN_TOTAL_ZOMBIES
      expect(result.fast).toBe(2); // 20% of total
      expect(result.regular).toBe(20);
      expect(result.big).toBe(0);
    });
  });
});
