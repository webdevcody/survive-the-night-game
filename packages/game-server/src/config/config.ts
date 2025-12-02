import { GameModeId } from "@/events/server-sent/events/game-started-event";

export const TICK_RATE = 20;

export const PERFORMANCE_LOG_INTERVAL = 5000;
export const TICK_RATE_MS = 1000 / TICK_RATE;

export const ENABLE_PERFORMANCE_MONITORING = process.env.ENABLE_PERFORMANCE_MONITORING === "true";

// TODO: move this to a separate config file
export const DEFAULT_GAME_MODE: GameModeId = "waves";
