# Item Registration and Sprite Sheet Flow

```mermaid
graph TB
    subgraph "1. Configuration"
        A[ITEM_CONFIGS<br/>item-configs.ts] -->|Defines items with| B[ItemConfig<br/>- id: string<br/>- category: string<br/>- assets: ItemAssetConfig]
        B -->|Contains| C[Sprite Coordinates<br/>- x: number<br/>- y: number<br/>- sheet: string<br/>- width/height: optional]
    end

    subgraph "2. Registration"
        D[entities/index.ts] -->|Imports| A
        D -->|Iterates| E[Object.values ITEM_CONFIGS]
        E -->|For each config| F[itemRegistry.register config]
        F -->|Stores in| G[ItemRegistry<br/>Map string, ItemConfig]
    end

    subgraph "3. Asset Generation"
        H[asset.ts] -->|Imports| I[itemRegistry from entities]
        I -->|Calls| J[itemRegistry.getAll]
        J -->|Returns| K[Array of ItemConfig]
        K -->|Passes to| L[mergeAssetsFromConfigs]
        L -->|For each item| M[createSimpleAsset<br/>assetKey, x, y, width, height, sheet]
        M -->|Generates| N[assetsMap<br/>Record assetKey, CropOptions]
        N -->|Contains| O[Asset mappings<br/>with sprite coordinates]
    end

    subgraph "4. Sprite Sheet Loading"
        P[AssetManager.load] -->|Loads| Q[Sprite Sheet Images<br/>- default: /tile-sheet.png<br/>- items: /sheets/items-sheet.png<br/>- characters: /sheets/characters-sheet.png]
        Q -->|Stores in| R[sheets Record<br/>string, HTMLImageElement]
    end

    subgraph "5. Cache Population"
        P -->|After loading sheets| S[populateCache]
        S -->|Iterates| T[Object.keys assetsMap]
        T -->|For each assetKey| U[Get cropOptions from assetsMap]
        U -->|Extract| V[sheet name, x, y, width, height]
        V -->|Get sheet image from| R
        R -->|Crop sprite using| W[imageManager.crop sheet, cropOptions]
        W -->|Store in| X[assetsCache<br/>Record Asset, HTMLImageElement]
    end

    subgraph "6. Usage"
        Y[EntityFactory] -->|Uses| P
        Z[Client Entities] -->|Calls| AA[assetManager.get assetKey]
        AA -->|Retrieves from| X
        X -->|Returns| AB[HTMLImageElement<br/>Cropped sprite]
    end

    style A fill:#e1f5ff
    style G fill:#fff4e1
    style N fill:#e8f5e9
    style R fill:#f3e5f5
    style X fill:#ffebee
    style AB fill:#e0f2f1
```

## Key Components

### 1. Configuration Phase
- **ITEM_CONFIGS**: Centralized configuration object defining all items
- Each item includes sprite coordinates (x, y) and sheet name
- Example: `{ id: "bandage", assets: { x: 48, y: 48, sheet: "items" } }`

### 2. Registration Phase
- Items are registered into `itemRegistry` singleton
- Registration happens at module load time in `entities/index.ts`
- Registry stores items in a Map for fast lookup

### 3. Asset Generation Phase
- `asset.ts` automatically generates asset mappings from registered items
- Uses `createSimpleAsset()` helper to create crop options
- Builds `assetsMap` that maps asset keys to sprite coordinates

### 4. Sprite Sheet Loading Phase
- AssetManager loads sprite sheet images asynchronously
- Three sprite sheets: default, items, characters
- Sheets are stored as HTMLImageElement objects

### 5. Cache Population Phase
- After sheets are loaded, sprites are cropped and cached
- Each asset key gets its sprite cropped from the appropriate sheet
- Cached sprites are ready for immediate use

### 6. Usage Phase
- Entities use AssetManager to retrieve sprites
- `assetManager.get(assetKey)` returns the cropped sprite image
- No need to recalculate coordinates or crop on each access

