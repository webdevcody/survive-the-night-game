import { BaseCommand } from "./base-command";
export class RestartCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "restart";
        this.description = "Starts a fresh new game with the current game mode";
        this.usage = "/restart";
    }
    execute(context) {
        const { gameLoop } = context;
        const currentMode = gameLoop.getGameModeStrategy().getConfig().modeId;
        void gameLoop.startNewGame().catch((err) => {
            console.error("[RestartCommand] startNewGame failed:", err);
        });
        return "Starting a fresh new game...";
    }
}
