import { BaseCommand, type CommandContext, type ICommand } from "./base-command";

export class HelpCommand extends BaseCommand {
  name = "help";
  description = "Shows all available commands";
  usage = "/help";
  requiresAdmin = false; // Help is available to everyone

  constructor(private getAllCommands: () => ICommand[]) {
    super();
  }

  execute(context: CommandContext): string {
    const commands = this.getAllCommands();

    if (commands.length === 0) {
      return "No commands available.";
    }

    const lines = ["Available commands:"];

    for (const cmd of commands) {
      const adminBadge = cmd.requiresAdmin ? " [ADMIN]" : "";
      lines.push(`  ${cmd.usage}${adminBadge} - ${cmd.description}`);
    }

    return lines.join("\n");
  }
}
