# Survive the Night Game

## Two Sentence Pitch

An online multiplay experience where you explore randomly generated worlds in search of supplies used to craft items for you and your base to help you survive the nights from waves of zombies.

## How to Run

1. `npm install`
2. `cp packages/dashboard/.env.example packages/dashboard/.env`
3. `npm run dev`

## Contributing

### How to Add a New Entity

see Spike.ts for a good example of a server entity using ECS.

1. Create an entity class and put it somewhere intelligent in the game-server/src/shared/entities directory
2. Add the entity to the `EntityFactory` in the `client` package.

### How to Add a New Extension

Extensions are a core part of our Entity Component System (ECS) that add specific behaviors to entities. Here's how to create one:

1. Create an extension class in the `game-server/src/shared/extensions` directory
2. Add the extension to the `extensionsMap` in `game-server/src/shared/extensions/index.ts` file

#### Example: Creating a Combustible Extension

Here's an example of how to create an extension that makes entities burst into flames when destroyed:

```typescript
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Positionable } from "./index";
import { Entity } from "../entities";
import { EntityType } from "../entity-types";

export default class Combustible implements Extension {
  // Define a unique name for the extension
  public static readonly Name = ExtensionNames.combustible;

  // required
  private self: Entity;

  // only used on this example
  private entityFactory: EntityFactory;

  // SERIALIZED PROPERTIES
  private numFires: number;
  private spreadRadius: number;

  // Constructor receives the entity this extension is attached to
  public constructor(
    self: Entity,
    entityFactory: EntityFactory,
    numFires = 3,
    spreadRadius = 32
  ) {
    this.self = self;
    this.entityFactory = entityFactory;
    this.numFires = numFires;
    this.spreadRadius = spreadRadius;
  }

  public update() {
    // if an extension has an update method, it'll be invoked each server tick
  }

  public deserialize(data: ExtensionSerialized): this {
    // this is invoked client side; if you have properties you want to sync between clients and server, you can deserialize them here
    return this;
  }

  public serialize(): ExtensionSerialized {
    // this is invoked server side; if you have properties you want to sync between clients and server, you can serialize them here
    return {
      name: Combustible.Name,
      numFires: this.numFires,
      spreadRadius: this.spreadRadius,
    };
  }
}
```

To use this extension on an entity:

```typescript
// In your entity class
import Combustible from "../extensions/combustible";

class ExplodingZombie extends Entity {
  constructor() {
    super();
    this.addExtension(new Combustible(this, entityFactory));
  }
}
```

Final Setup

1. Add the extension to `extensionsMap` in `game-server/src/shared/extensions/index.ts`
2. Add the extension to `ExtensionNames` in `game-server/src/shared/extensions/types.ts`

Key points when creating extensions:

- Implement `serialize` and `deserialize` methods for network synchronization
- Extensions can interact with other extensions through the parent entity
