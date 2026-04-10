import { BaseCommand, type CommandContext, type ICommand } from "./base-command";
export declare class HelpCommand extends BaseCommand {
    private getAllCommands;
    name: string;
    description: string;
    usage: string;
    requiresAdmin: boolean;
    constructor(getAllCommands: () => ICommand[]);
    execute(context: CommandContext): string;
}
