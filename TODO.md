# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## Suggestions

- when the car is destroyed, change it to a broken car sprite display
- refactor how the car is defined in the editor. the car should not be part of the map but something in the entities list so it can be easily modified on death.
- still can't type M in chat
- the swipe animation should also face the direction of the player attack when mouse clicked, the melee attack should check for collisions in an arc towards the mouse
- remove the ability to attack using space
- ​​Also are there zombie types? I’m thinking explosive one holding a gas can you have to hit from range, maybe a ghost that has to be shot in dark or only stabbed, zombie who immobilizes you if hit
- checkout the game called Darkwood
- ​​no ammo in this game
- ​the game never ends because everyone respawns immediately
- ​walls are bad because they block movement and spikes are too weak
- when game ended, it never reset the wave timer
- torches don't seem to stack but they are stackable
- grenade needs to fire at crosshair like weapons
- display crates on mini map and map
- play a sound when the wave starts
- ​​add gate that works like wall but users can go through while zombies not
- ​​add a fear / anxiety meter when outside of base at night, when it gets low you do "something" negative to players
- add aim with cursor or at least 8 directions, it's annoying that I can only shoot 4 directions

## Bug

- I'm not able to craft on game server.. something is wrong with the inventory / crafting
- add ability to drag map around with a click drag approach
- add a click any button to respawn
- remove the ability to revive players

Uncaught Error: Image not found: zombie*swing_facing_left*-1
at Ws.getFrameWithDirection (index-BwqH-Gfo.js:1:20231)
at \_s.render (index-BwqH-Gfo.js:3:53681)
at index-BwqH-Gfo.js:3:65073
at Array.forEach (<anonymous>)
at Po.render (index-BwqH-Gfo.js:3:65059)
at mo.render (index-BwqH-Gfo.js:3:51459)
at t (index-BwqH-Gfo.js:3:77097)

- when someone is typing into the chat, disable all the other hotkeys

## TODO

- hook the configuration panel so that values propigate to the server as well so I don't have to restart the server when tweaking values

- when the night starts, have the wave of zombies spawn closer to the campsite, also don't spawn all at once, spawn in waves
- I don't like the random spawns of zombies, it would be cool if they had a heard or group walk behavior
- crafting is hard, move resources to stack player resources
- improve crafting menu
- reduce time for night / day
- have a weapon menu separate from inventory
- combine weapon / ammo in hud so it's easier to read how much you got left
- allow crafting
- remove health bars over entities
-

- add a way to ban / kick, add some type of logic to prevent bad words on usernames
- cycling weapons (q/a) doesn't seem to work when you just have a single weapon in inventory
- when pressing f, it doesn't seem to always let the server know you are trying to interact. double check the
  logic around pressing keys / unpressing them, I think maybe it doesn't send the correct input map if you
  release the key you pressed and unpress it too fast.
- changing items with scroll bar would be useful
- play walking / running sounds when players move around
- when the server updates, it doesn't auto refresh the users... just force reload their browser
- coins
  - play a coin noise when it drops
  - make coin animation slide to inventory on pickup
- figure out a better way to positions of the weapons so they look attached to the hands
- figure out why negative latencies are a thing in the leaderboard
- should also make it randomly choose to drop a coin or not. So your risk is raised even more because you may not get a coin.
- add indicators so I can easily find my team mates
- add the ability for users to find a merchant which will sell items using the coins players have collected
- game mode: battle royal mode (1 player zombie, everyone else human)
- add in initial map zombies that stay near their spawned biome area and will only chase humans so far, also they will not auto be killed when the night ends.
- walking vs running can attract these idle zombies differently, the more noise you make causes zombies to chase you if within a certain radius. (only applies to idle zombies)
- for the barn biome, a player can interact with the door of the barn which will spawn a bunch of zombies at the door, but also drop a lot of good loot
- potentially have loot boxes that zombies might drop keys for (exploration to find the boxes, and the keys)
- random supply drops with mini map indicator about drop
- proximity voice chat
- play a dong noise and up beat music for the wave
- during the day time, play a low tempo ambient music
- from stevan: ​i still vote for an "npm run add:entity" script that like scaffolds it out for you.

### Refactoring

- consider a better way to play the explosion sound when the particle is initialized, see explosion.ts line 20.

### Gameplay

- [ ] zombie that can only be damanged while on fire zombie in a firefighter outfit
- [ ] make the player health look nicer (could use hearts like zelda, or progress bar like in the game "dying light")
- [ ] add a nice indicator for the day / night cycle (could use a sun and moon icon; checkout don't starve together)

### Sounds

- [ ] auto clean up sound entities after 5 seconds.
- [ ] add sound for zombie walking
- [ ] add sound for item craft
- [ ] ambient background music that can be turned off

### Lobby

- [ ] a user shall be able to browse lobbies
- [ ] a user shall be able to join a lobby
- [ ] a user shall be able to create a new lobby
- [ ] a lobby leader shall be able to start the game
- [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)

## Medium Priority (Enhancements):

- [ ] air drops (randomly drop crates around the map when day starts)
- [ ] a user can search cabinets for items (randomly drop items)
- [ ] a user shall be able to view a mini map which helps them know where they are
- [ ] implement a fog of war effect in the mini map for unexplored areas
- [ ] add in lighting / flashlight (maybe look into shaders?)
- [ ] a player can pick a custom name to display over his head
- [ ] a player can chat with other players in their game via text
- [ ] a user shall be able to see stamina bar which recharges slowly over time
- [ ] a user shall be able to run using shift
- [ ] zombie never stops walking, even when killed all players
- [ ] person hosting game server should be able to login as admin in console and have ability to ban/kick/teleport players (by Aaron)

## Low Priority (Polish):

- [ ] use scroll wheel instead of +/- buttons
- [ ] display user friendly message whenever there's a connection problem

## Refactoring (Tech Debt Plz Fix):

- [ ] after saving game-client changes, the changes are not reflected in the dashboard until a hard refresh. it would be better if it was hot reloaded
- [ ] needing to place the images inside the next project when they belong to the client feels strange; I'm not sure if static asset bundling is a better approach
- [ ] sometimes auto import will not work depending on if you are editing a file in the client or server. It's like the types don't get picked up correctly between the sub projects.
- [ ] apply delta compression to the server game state updates
