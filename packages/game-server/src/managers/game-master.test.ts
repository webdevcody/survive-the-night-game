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
      expect(result.total).toBe(10);
      expect(result.regular).toBe(10);
      expect(result.fast).toBe(0);
      expect(result.big).toBe(0);
    });

    it("should introduce fast zombies on night 3", () => {
      const result = gameMaster.getNumberOfZombies(3);
      expect(result.total).toBe(11);
      expect(result.fast).toBe(3);
      expect(result.regular).toBe(7);
      expect(result.big).toBe(0);
    });

    it("should introduce fast zombies on night 5", () => {
      const result = gameMaster.getNumberOfZombies(5);
      expect(result.total).toBe(19);
      expect(result.fast).toBe(4);
      expect(result.regular).toBe(11);
      expect(result.big).toBe(2);
    });

    it("should introduce fast zombies on night 10", () => {
      const result = gameMaster.getNumberOfZombies(10);
      expect(result.total).toBe(39);
      expect(result.fast).toBe(9);
      expect(result.regular).toBe(23);
      expect(result.big).toBe(5);
    });
  });
});
