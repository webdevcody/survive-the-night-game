import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { Player } from "@/entities/players/player";
import { AITarget } from "../ai-targeting";
import { EnhancedThreatInfo } from "../ai-targeting";
import { DecisionResult } from "../ai-decision-engine";
import { AIStateMachine } from "../ai-state-machine";
import { AITargetingSystem } from "../ai-targeting";
import { AIPathfinder } from "../ai-pathfinding";
import { AIExplorationTracker } from "../ai-exploration-tracker";
import { IGameManagers } from "@/managers/types";

/**
 * Context passed to state handlers
 */
export interface AIStateContext {
  player: Player;
  gameManagers: IGameManagers;
  stateMachine: AIStateMachine;
  targetingSystem: AITargetingSystem;
  pathfinder: AIPathfinder;
  explorationTracker: AIExplorationTracker;
  currentTarget: AITarget | null;
  combatTarget: AITarget | null;
  currentWaypoint: Vector2 | null;
  enhancedThreatInfo: EnhancedThreatInfo | null;
  lastDecision: DecisionResult | null;
  fireTimer: number;
  interactTimer: number;
  shouldSprint: (isUrgent: boolean) => boolean;
  calculateAimAngle: (source: Vector2, target: Vector2) => number;
  angleToDirection: (angle: number) => import("@/util/direction").Direction;
  findWalkableWaypoint: (playerPos: Vector2, targetPos: Vector2) => Vector2 | null;
  calculateRetreatPosition: (playerPos: Vector2, enemyPos: Vector2, dist: number) => Vector2;
  moveTowardWaypoint: (input: Input, playerPos: Vector2) => boolean;
  recalculatePath: () => void;
  setCurrentTarget: (target: AITarget | null) => void;
  setCurrentWaypoint: (waypoint: Vector2 | null) => void;
  setCombatTarget: (target: AITarget | null) => void;
  resetInteractTimer: () => void;
}

/**
 * Base interface for AI state handlers
 */
export interface AIStateHandler {
  /**
   * Handle state behavior - generate input for the AI
   */
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void;
}


