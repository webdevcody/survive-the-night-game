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

see TriggerCooldownAttacker.ts for a good example of a server extension using ECS.

1. Create an extension class and put it somewhere intelligent in the game-server/src/shared/extensions directory
2. Add the extension to the `extensionsMap` in the game-server/src/shared/extensions/index.ts file
