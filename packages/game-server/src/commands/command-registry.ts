import type { ICommand, CommandContext } from "./base-command";
import { DEFAULT_ADMIN_PASSWORD } from "../config/env";
import { ADMIN_PASSWORD } from "../config/env";

export class CommandRegistry {
  private commands = new Map<string, ICommand>();

  /**
   * Register a command
   */
  register(command: ICommand): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  /**
   * Get a command by name
   */
  get(name: string): ICommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Get all registered commands
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if user has admin privileges
   * In development mode (default password), anyone can use admin commands
   * In production mode (custom password), password must be provided
   */
  private isAdmin(password?: string): boolean {
    // If using default password, allow admin commands (dev mode)
    if (ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
      return true;
    }
    // Otherwise, require password to match ADMIN_PASSWORD
    return password === ADMIN_PASSWORD;
  }

  /**
   * Execute a command from a chat message
   * @param message - The chat message (e.g., "/spawn zombie")
   * @param context - The command execution context
   * @param adminPassword - Optional admin password from localStorage
   * @returns The result message, or undefined if not a command or no permission
   */
  async executeFromChat(
    message: string,
    context: CommandContext,
    adminPassword?: string
  ): Promise<string | void> {
    // Check if message is a command
    if (!message.startsWith("/")) {
      return;
    }

    // Parse command and arguments
    const parts = message.slice(1).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Get command
    const command = this.get(commandName);
    if (!command) {
      return `Unknown command: /${commandName}. Type /help for available commands.`;
    }

    // Check admin privileges if required
    if (command.requiresAdmin) {
      if (!this.isAdmin(adminPassword)) {
        return `Command /${commandName} requires admin privileges. ${
          ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD
            ? ""
            : "Set the admin password in localStorage with key 'admin_password'."
        }`;
      }
    }

    // Update context with parsed args
    context.args = args;

    // Execute command
    try {
      return await command.execute(context);
    } catch (error) {
      console.error(`Error executing command /${commandName}:`, error);
      return `Error executing command: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
