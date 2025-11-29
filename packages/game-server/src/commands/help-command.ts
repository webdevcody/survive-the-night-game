import { BaseCommand, type CommandContext, type ICommand } from "./base-command";
import { DEFAULT_ADMIN_PASSWORD, ADMIN_PASSWORD } from "../config/env";

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

    const isProduction = ADMIN_PASSWORD !== DEFAULT_ADMIN_PASSWORD;
    const lines = ["Available commands:"];

    for (const cmd of commands) {
      const adminBadge = cmd.requiresAdmin ? " [ADMIN]" : "";
      let usage = cmd.usage;
      // Add password hint for admin commands in production
      if (cmd.requiresAdmin && isProduction) {
        usage = `${cmd.usage} <password>`;
      }
      lines.push(`  ${usage}${adminBadge} - ${cmd.description}`);
    }

    if (isProduction) {
      lines.push("\nNote: Admin commands require the admin password as the last argument.");
    }

    return lines.join("\n");
  }
}
