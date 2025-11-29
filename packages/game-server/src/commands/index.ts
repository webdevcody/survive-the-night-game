import { CommandRegistry } from "./command-registry";
import { SpawnCommand } from "./spawn-command";
import { ListEntitiesCommand } from "./list-entities-command";
import { HelpCommand } from "./help-command";
import { ModeCommand } from "./mode-command";
import { RestartCommand } from "./restart-command";

/**
 * Creates and initializes the command registry with all available commands
 */
export function createCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  // Register all commands
  registry.register(new SpawnCommand());
  registry.register(new ListEntitiesCommand());
  registry.register(new ModeCommand());
  registry.register(new RestartCommand());
  registry.register(new HelpCommand(() => registry.getAll()));

  return registry;
}

export { CommandRegistry } from "./command-registry";
export type { ICommand, CommandContext } from "./base-command";
