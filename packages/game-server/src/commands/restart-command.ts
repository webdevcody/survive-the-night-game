import { BaseCommand, type CommandContext } from "./base-command";

export class RestartCommand extends BaseCommand {
  name = "restart";
  description = "Starts a fresh new game with the current game mode";
  usage = "/restart";

  execute(context: CommandContext): string | void {
    const { gameLoop } = context;

    const currentMode = gameLoop.getGameModeStrategy().getConfig().modeId;
    console.log(`[RestartCommand] Restarting game with mode: ${currentMode}`);

    gameLoop.startNewGame();

    return "Starting a fresh new game...";
  }
}
