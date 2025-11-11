# Entity System Architecture Diagram

```mermaid
graph TB
    subgraph "Shared Layer (game-shared)"
        direction TB
        CONFIGS[Config Files]
        CONFIGS --> ITEM_CONFIGS[ITEM_CONFIGS]
        CONFIGS --> WEAPON_CONFIGS[WEAPON_CONFIGS]
        CONFIGS --> ZOMBIE_CONFIGS[ZOMBIE_CONFIGS]
        CONFIGS --> PROJECTILE_CONFIGS[PROJECTILE_CONFIGS]
        CONFIGS --> ENV_CONFIGS[ENVIRONMENT_CONFIGS]
        CONFIGS --> CHAR_CONFIGS[CHARACTER_CONFIGS]

        ITEM_CONFIGS --> ITEM_REG[itemRegistry]
        WEAPON_CONFIGS --> WEAPON_REG[weaponRegistry]
        ZOMBIE_CONFIGS --> ZOMBIE_REG[zombieRegistry]
        PROJECTILE_CONFIGS --> PROJ_REG[projectileRegistry]
        ENV_CONFIGS --> ENV_REG[environmentRegistry]
        CHAR_CONFIGS --> CHAR_REG[characterRegistry]

        ITEM_REG --> ENTITY_GEN[generateEntities]
        WEAPON_REG --> ENTITY_GEN
        ZOMBIE_REG --> ENTITY_GEN
        PROJ_REG --> ENTITY_GEN
        ENV_REG --> ENTITY_GEN
        CHAR_REG --> ENTITY_GEN

        ENTITY_GEN --> ENTITIES_CONST[Entities Constant]
        ENTITIES_CONST --> |"Auto-generated<br/>entity IDs"| ENTITY_TYPES[EntityType definitions]
    end

    subgraph "Server Side (game-server)"
        direction TB
        SERVER_INIT[Server Startup]
        SERVER_INIT --> REG_CUSTOM[registerCustomEntities]

        REG_CUSTOM --> SERVER_OVERRIDE[entityOverrideRegistry]
        SERVER_OVERRIDE --> |"Registers custom<br/>entity classes"| SERVER_CLASSES[Custom Server Entity Classes]
        SERVER_CLASSES --> PLAYER_S[Player]
        SERVER_CLASSES --> ZOMBIE_S[Zombie, BigZombie, etc.]
        SERVER_CLASSES --> ITEM_S[Tree, Wall, Bandage, etc.]
        SERVER_CLASSES --> WEAPON_S[Pistol, Shotgun, etc.]
        SERVER_CLASSES --> PROJ_S[Bullet, GrenadeProjectile, etc.]

        SERVER_INIT --> ENTITY_MGR[EntityManager]
        ENTITY_MGR --> CREATE_ENTITY[createEntity method]

        CREATE_ENTITY --> CHECK_OVERRIDE{Check<br/>Override<br/>Registry?}
        CHECK_OVERRIDE -->|"Found"| USE_CUSTOM[Use Custom Class]
        CHECK_OVERRIDE -->|"Not Found"| CHECK_GENERIC{Check<br/>Generic<br/>Fallback?}

        CHECK_GENERIC -->|"Found in<br/>itemRegistry"| GENERIC_ITEM[GenericItemEntity]
        CHECK_GENERIC -->|"Not Found"| ERROR[Return null / Warn]

        USE_CUSTOM --> INSTANTIATE_S[Instantiate Entity]
        GENERIC_ITEM --> INSTANTIATE_S

        INSTANTIATE_S --> ADD_ENTITY[addEntity to EntityManager]
        ADD_ENTITY --> ENTITY_MAP[entityMap storage]

        ENTITY_MAP --> SYNC[Sync to Clients]
        SYNC --> BROADCAST[Broadcast GameStateEvent]
    end

    subgraph "Client Side (game-client)"
        direction TB
        CLIENT_INIT[Client Startup]
        CLIENT_INIT --> REG_CLIENT[registerCustomClientEntities]

        REG_CLIENT --> CLIENT_OVERRIDE[clientEntityOverrideRegistry]
        CLIENT_OVERRIDE --> |"Registers custom<br/>client entity classes"| CLIENT_CLASSES[Custom Client Entity Classes]
        CLIENT_CLASSES --> PLAYER_C[PlayerClient]
        CLIENT_CLASSES --> ZOMBIE_C[ZombieClient, BigZombieClient, etc.]
        CLIENT_CLASSES --> ITEM_C[TreeClient, WallClient, etc.]
        CLIENT_CLASSES --> WEAPON_C[PistolClient, ShotgunClient, etc.]
        CLIENT_CLASSES --> PROJ_C[BulletClient, etc.]

        CLIENT_INIT --> ENTITY_FACTORY[EntityFactory]

        BROADCAST --> RECEIVE[Receive RawEntity data]
        RECEIVE --> FACTORY_CREATE[EntityFactory.createEntity]

        FACTORY_CREATE --> CHECK_CLIENT_OVERRIDE{Check<br/>Client Override<br/>Registry?}
        CHECK_CLIENT_OVERRIDE -->|"Found"| USE_CLIENT_CUSTOM[Use Custom Client Class]
        CHECK_CLIENT_OVERRIDE -->|"Not Found"| CHECK_CLIENT_GENERIC{Check<br/>Generic<br/>Fallback?}

        CHECK_CLIENT_GENERIC -->|"Found in<br/>itemRegistry"| GENERIC_CLIENT[GenericClientEntity]
        CHECK_CLIENT_GENERIC -->|"Not Found"| CLIENT_ERROR[Throw Error]

        USE_CLIENT_CUSTOM --> INSTANTIATE_C[Instantiate Client Entity]
        GENERIC_CLIENT --> INSTANTIATE_C

        INSTANTIATE_C --> DESERIALIZE[Deserialize RawEntity data]
        DESERIALIZE --> ADD_CLIENT[Add to Client GameState]
        ADD_CLIENT --> RENDER[Render Entity]
    end

    subgraph "Entity Creation Flow"
        direction LR
        SPAWN[Entity Spawn Request]
        SPAWN --> SERVER_CREATE[Server: createEntity]
        SERVER_CREATE --> SERVER_INST[Server: Instantiate]
        SERVER_INST --> SERVER_ADD[Server: Add to EntityManager]
        SERVER_ADD --> SERVER_UPDATE[Server: Update GameState]
        SERVER_UPDATE --> SERVER_SYNC[Server: Sync to Clients]
        SERVER_SYNC --> CLIENT_RECV[Client: Receive RawEntity]
        CLIENT_RECV --> CLIENT_CREATE[Client: EntityFactory.createEntity]
        CLIENT_CREATE --> CLIENT_INST[Client: Instantiate]
        CLIENT_INST --> CLIENT_ADD[Client: Add to GameState]
    end

    style CONFIGS fill:#e1f5ff
    style ENTITIES_CONST fill:#e1f5ff
    style SERVER_OVERRIDE fill:#ffe1f5
    style CLIENT_OVERRIDE fill:#fff5e1
    style ENTITY_MGR fill:#ffe1f5
    style ENTITY_FACTORY fill:#fff5e1
    style GENERIC_ITEM fill:#f0f0f0
    style GENERIC_CLIENT fill:#f0f0f0
```

## Key Concepts

### 1. **Shared Configuration Layer**

- All entity configurations (items, weapons, zombies, etc.) are defined in `game-shared`
- Configs are registered into registries (itemRegistry, weaponRegistry, etc.)
- `generateEntities()` auto-generates the `Entities` constant from all registries
- This ensures adding a new config automatically makes it available everywhere

### 2. **Server Entity System**

- **Override Registry**: Maps entity types to custom server entity classes
- **EntityManager**: Creates and manages all server entities
- **Creation Flow**:
  1. Check `entityOverrideRegistry` for custom class
  2. If not found, check `itemRegistry` for generic fallback
  3. Instantiate entity and add to EntityManager
- **Custom Classes**: Player, Zombies, Items with custom behavior, Weapons, Projectiles
- **Generic Fallback**: `GenericItemEntity` for simple items without custom behavior

### 3. **Client Entity System**

- **Override Registry**: Maps entity types to custom client entity classes
- **EntityFactory**: Creates client entities from server data
- **Creation Flow**:
  1. Receive `RawEntity` data from server
  2. Check `clientEntityOverrideRegistry` for custom class
  3. If not found, check `itemRegistry` for generic fallback
  4. Instantiate client entity and deserialize data
- **Custom Classes**: Client versions of all server entities (PlayerClient, ZombieClient, etc.)
- **Generic Fallback**: `GenericClientEntity` for simple items

### 4. **Entity Synchronization**

- Server maintains authoritative entity state
- Server broadcasts `GameStateEvent` with entity data
- Client receives `RawEntity` objects and creates corresponding client entities
- Client entities deserialize server data to update their state

### 5. **Adding New Entities**

When adding a new entity type:

1. **Add config** to appropriate registry in `game-shared` (item, weapon, zombie, etc.)
2. **Register custom class** in `registerCustomEntities()` on server (if needed)
3. **Register custom client class** in `registerCustomClientEntities()` on client (if needed)
4. **Add to entityMap** in EntityManager (if it's a zombie/enemy)
5. **Update map manager** spawn logic (if it should spawn naturally)
