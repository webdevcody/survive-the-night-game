import { BaseCommand, type CommandContext } from "./base-command";
import { BattleRoyaleModeStrategy } from "@/game-modes/battle-royale-mode-strategy";
import { InfectionModeStrategy } from "@/game-modes/infection-mode-strategy";
import { OpenWorldModeStrategy } from "@/game-modes/open-world-mode-strategy";

const VALID_MODES = ["royale", "infection", "open"] as const;
type GameMode = (typeof VALID_MODES)[number];

export class ModeCommand extends BaseCommand {
  name = "mode";
  description = "Switches the game mode and restarts the game";
  usage = "/mode <royale|infection|open>";

  execute(context: CommandContext): string | void {
    const { args, gameLoop } = context;

    if (args.length === 0) {
      const currentMode = gameLoop.getGameModeStrategy().getConfig().modeId;
      return `Current mode: ${currentMode}. Usage: /mode <royale|infection|open>`;
    }

    const raw = args[0].toLowerCase();
    const mode = (raw === "open_world" ? "open" : raw) as GameMode;

    if (!VALID_MODES.includes(mode)) {
      return `Invalid mode: ${mode}. Available modes: ${VALID_MODES.join(", ")}`;
    }

    const onFail = (err: unknown) => console.error("[ModeCommand] startNewGame failed:", err);

    switch (mode) {
      case "royale":
        void gameLoop.startNewGame(new BattleRoyaleModeStrategy()).catch(onFail);
        return "Starting Battle Royale mode...";

      case "infection":
        void gameLoop.startNewGame(new InfectionModeStrategy()).catch(onFail);
        return "Starting Infection mode...";

      case "open":
        void gameLoop.startNewGame(new OpenWorldModeStrategy()).catch(onFail);
        return "Starting Open World mode...";
    }
  }
}
