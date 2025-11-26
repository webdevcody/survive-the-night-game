import { BaseCommand, type CommandContext } from "./base-command";
import { WavesModeStrategy } from "@/game-modes/waves-mode-strategy";
import { BattleRoyaleModeStrategy } from "@/game-modes/battle-royale-mode-strategy";

const VALID_MODES = ["royale", "waves"] as const;
type GameMode = (typeof VALID_MODES)[number];

export class ModeCommand extends BaseCommand {
  name = "mode";
  description = "Switches the game mode and restarts the game";
  usage = "/mode <royale|waves>";

  execute(context: CommandContext): string | void {
    const { args, gameLoop } = context;

    if (args.length === 0) {
      const currentMode = gameLoop.getGameModeStrategy().getConfig().modeId;
      return `Current mode: ${currentMode}. Usage: /mode <royale|waves>`;
    }

    const mode = args[0].toLowerCase() as GameMode;

    if (!VALID_MODES.includes(mode)) {
      return `Invalid mode: ${mode}. Available modes: ${VALID_MODES.join(", ")}`;
    }

    switch (mode) {
      case "royale":
        console.log("[ModeCommand] Starting Battle Royale mode");
        gameLoop.startNewGame(new BattleRoyaleModeStrategy());
        return "Starting Battle Royale mode...";

      case "waves":
        console.log("[ModeCommand] Starting Waves mode");
        gameLoop.startNewGame(new WavesModeStrategy());
        return "Starting Waves mode...";
    }
  }
}
