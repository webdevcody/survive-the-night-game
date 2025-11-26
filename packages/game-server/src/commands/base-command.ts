import type { Player } from "../entities/players/player";
import type { EntityManager } from "../managers/entity-manager";
import type { IGameLoop } from "../managers/types";

export interface CommandContext {
  player: Player;
  args: string[];
  entityManager: EntityManager;
  gameLoop: IGameLoop;
}

export interface ICommand {
  /** Command name (without the / prefix) */
  name: string;

  /** Brief description of what the command does */
  description: string;

  /** Usage example (e.g., "/spawn zombie" or "/help") */
  usage: string;

  /** Whether this command requires admin privileges */
  requiresAdmin: boolean;

  /**
   * Execute the command
   * @param context - The command execution context
   * @returns A message to send back to the player, or void
   */
  execute(context: CommandContext): Promise<string | void> | string | void;
}

export abstract class BaseCommand implements ICommand {
  abstract name: string;
  abstract description: string;
  abstract usage: string;
  requiresAdmin = true;

  abstract execute(context: CommandContext): Promise<string | void> | string | void;
}
