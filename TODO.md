# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## Bug

- if you pick up a wall that is damaged and put it back down, it seems to go back to full hp again.

- the server randomly crashed with the following

/app/packages/game-server/dist/server.cjs:2686
throw new Error(`Unknown entity type: ${type}`);
^

Error: Unknown entity type: arrow
at EntityTypeRegistry.encode (/app/packages/game-server/dist/server.cjs:2686:13)
at \_Arrow.serializeToBuffer (/app/packages/game-server/dist/server.cjs:3892:42)
at BufferManager.writeEntity (/app/packages/game-server/dist/server.cjs:14203:12)
at Broadcaster.broadcastGameStateUpdate (/app/packages/game-server/dist/server.cjs:14911:31)
at Broadcaster.broadcastEvent (/app/packages/game-server/dist/server.cjs:14854:12)
at ServerSocketManager.broadcastEvent (/app/packages/game-server/dist/server.cjs:16053:22)
at GameLoop.broadcastGameState (/app/packages/game-server/dist/server.cjs:17276:24)
at GameLoop.update (/app/packages/game-server/dist/server.cjs:17176:10)
at Timeout.\_onTimeout (/app/packages/game-server/dist/server.cjs:17114:12)
at listOnTimeout (node:internal/timers:605:17)

Node.js v24.11.

## DevEx

- when inventory is full, and you are trying to interact with a progress interable, the radial progress bar inifintely just loops, instead give feedback to the user that their inventory is full (make interactive text red and put small inventory full text above / below), (make item flip)
- scale the merchant menu on smaller screens
- Can you make it where we scroll our mouse to switch hotbar slots
- some items are way to expensive
- key shortcuts to switch to prev weapon (q)
- force next round button
- all the item configs should reference the proper item sheets and remove "default" from all over the codebase. first start with any items that are set to "default", those need to be refactored, then refactor the javascript
- I need to refactor how the assets are managed. At the very least, throw an error if the same asset is loaded with the same asset key.
- check if the deserialize method on extensions is used, at this point we should only be using deserializeFromBuffer
- the approach for compression is very hacky, find a more elegant solution
- find an abstract method or class for projectiles as there is a lot of common functionality in terms of them traveling for X amount of distance, then needing to run some logic after that distance is reached, also similar groups they intersect with to damage. Maybe put arrow, knife, bullet, and grenade as similar type of projectiles when updating. the common logic is how they update, but there are difference in what happens when they go the max distance (a throwing knife and arrow will land on the ground to be picked up later, the grenade explodes with a timer so the max distance acts more as a potential trigger, bullet will travel a max distance as well).

## UX

- buying shotgun ammo from merchant and I can't use it
- throwing knifes don't go over walls or trees which is annoying
- when the car is destroyed, change it to a broken car sprite display
- refactor how the car is defined in the editor. the car should not be part of the map but something in the entities list so it can be easily modified on death.

## Game Design

- new zombie types
  - a new zombie type who immobilizes you if hit
  - a new zombie type who can poison you
- Could not spawn all zombies at location (1136, 848)
- ​​add gate that works like wall but users can go through while zombies not
- combine weapon / ammo in hud so it's easier to read how much you got left
- figure out a better way to positions of the weapons so they look attached to the hands
- game mode: battle royal mode (1 player zombie, everyone else human)
- do not play walking animation for surviver when they are non rescued
- on death, a player will now turn into a zombie. plan and implement this implementation. player zombies will spawn on the outskirts of the map.
- have a weapon menu separate from inventory
- changing items with scroll bar would be useful
- having a semi-translucened circurar weapon inventory would look cool, it would enable to quickly changing weapons.

## Bug

- sometimes the shift / run gets stuck down and I have to press shift again to untoggle it

## Devex

- when the server updates, it doesn't auto refresh the users... just force reload their browser
- proximity voice chat

## Lobby

- [ ] a user shall be able to browse lobbies
- [ ] a user shall be able to join a lobby
- [ ] a user shall be able to create a new lobby
- [ ] a lobby leader shall be able to start the game
- [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)
