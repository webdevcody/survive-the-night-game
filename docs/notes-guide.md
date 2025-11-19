# Adding and Positioning Notes

This guide explains how to add new notes to the game world and change their locations.

## Where is the Code?

The logic for spawning notes is located in:
**`packages/game-server/src/managers/map-manager.ts`**

Specifically, look for the `spawnNote()` method (or similar spawning methods called within `generateMap()`).

## How to Add a New Note

To add a new note, you need to:
1.  Instantiate a new `Note` entity.
2.  Set its `title` and `content`.
3.  Calculate its position (x, y).
4.  Add it to the entity manager.

### Example Code

Add this code inside `spawnNote()` or a new method in `MapManager`:

```typescript
import { Note } from "@/entities/items/note";
import { getConfig } from "@/config";

// ... inside MapManager class ...

private spawnMyNewNote() {
    // 1. Create the note
    const note = new Note(this.getGameManagers());
    
    // 2. Set content
    note.title = "My New Note Title";
    note.content = "This is the text that will appear in the scroll.\n\nYou can use newlines for paragraphs.";

    // 3. Calculate Position
    // Example: Place it at a specific tile coordinate (e.g., tile 100, 100)
    const tileX = 100;
    const tileY = 100;
    
    // Convert tile coordinates to world coordinates (pixels)
    const x = tileX * getConfig().world.TILE_SIZE;
    const y = tileY * getConfig().world.TILE_SIZE;

    // Set the position
    note.setPosition(PoolManager.getInstance().vector2.claim(x, y));

    // 4. Add to game
    this.getEntityManager().addEntity(note);
}
```

## How to Change Locations

Notes are positioned using **World Coordinates** (pixels). The map is made up of **Tiles**.
To place a note at a specific tile, multiply the tile coordinate by `getConfig().world.TILE_SIZE` (usually 16).

### finding Locations
- **Center of Map**: `Math.floor(MAP_SIZE / 2) * BIOME_SIZE + Math.floor(BIOME_SIZE / 2)` gives the center tile.
- **Specific Biomes**: You can use biome positions like `this.farmBiomePosition` or `this.cityBiomePosition` to place notes near specific landmarks.

```typescript
// Example: Place note near the Farm
if (this.farmBiomePosition) {
    const farmTileX = this.farmBiomePosition.x * BIOME_SIZE + 5; // Offset by 5 tiles
    const farmTileY = this.farmBiomePosition.y * BIOME_SIZE + 5;
    
    const x = farmTileX * getConfig().world.TILE_SIZE;
    const y = farmTileY * getConfig().world.TILE_SIZE;
    
    // ... set position ...
}
```

## Adding Multiple Notes

You can create a list of note configurations and loop through them to keep your code clean:

```typescript
const notesData = [
    { title: "Note 1", content: "...", x: 100, y: 100 },
    { title: "Note 2", content: "...", x: 250, y: 300 },
];

notesData.forEach(data => {
    const note = new Note(this.getGameManagers());
    note.title = data.title;
    note.content = data.content;
    note.setPosition(PoolManager.getInstance().vector2.claim(data.x, data.y));
    this.getEntityManager().addEntity(note);
});
```
