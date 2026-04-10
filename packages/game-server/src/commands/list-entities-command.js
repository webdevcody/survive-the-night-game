import { SPAWNABLE_ENTITY_TYPES } from "@/constants";
import { BaseCommand } from "./base-command";
export class ListEntitiesCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.name = "list";
        this.description = "Lists all available entities that can be spawned";
        this.usage = "/list";
    }
    execute(context) {
        const availableEntities = SPAWNABLE_ENTITY_TYPES;
        // Format entities into 3 columns
        const COLUMNS = 3;
        const COLUMN_WIDTH = 20; // Fixed width for each column
        const rows = [];
        // Calculate number of rows needed
        const numRows = Math.ceil(availableEntities.length / COLUMNS);
        // Build each row
        for (let row = 0; row < numRows; row++) {
            const rowItems = [];
            for (let col = 0; col < COLUMNS; col++) {
                const index = row * COLUMNS + col;
                if (index < availableEntities.length) {
                    const entity = availableEntities[index];
                    // Pad the entity name to the column width
                    const paddedEntity = entity.padEnd(COLUMN_WIDTH, " ");
                    rowItems.push(paddedEntity);
                }
            }
            rows.push(rowItems.join(""));
        }
        return `Available entities:\n${rows.join("\n")}`;
    }
}
