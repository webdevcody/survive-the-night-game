import { BaseCommand, type CommandContext } from "./base-command";
export declare class SpawnCommand extends BaseCommand {
    name: string;
    description: string;
    usage: string;
    execute(context: CommandContext): string | void;
}
