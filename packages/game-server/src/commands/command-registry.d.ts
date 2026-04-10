import type { ICommand, CommandContext } from "./base-command";
export declare class CommandRegistry {
    private commands;
    /**
     * Register a command
     */
    register(command: ICommand): void;
    /**
     * Get a command by name
     */
    get(name: string): ICommand | undefined;
    /**
     * Get all registered commands
     */
    getAll(): ICommand[];
    /**
     * Check if user has admin privileges
     * In development mode (default password), anyone can use admin commands
     * In production mode (custom password), password must be provided
     */
    private isAdmin;
    /**
     * Execute a command from a chat message
     * @param message - The chat message (e.g., "/spawn zombie")
     * @param context - The command execution context
     * @param adminPassword - Optional admin password from localStorage
     * @returns The result message, or undefined if not a command or no permission
     */
    executeFromChat(message: string, context: CommandContext, adminPassword?: string): Promise<string | void>;
}
