# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## High Priority (Core Mechanics):

### Refactoring

- [ ] find a way to reduce the amount of duplicate code
- [ ] the client entities feels very duplicates to the server entities, find a way reuse code maybe?
- [ ] sometimes when doing @ imports, the entire app breaks forcing us to use relative... figure out why
- [ ] serialize should be more automated, I often forget to update it when I add new properties
- [ ] rename hotbar to item belt

### Bugs

- [ ] when DEBUG = true, all the HUD overlays seem to shift, including the "pickup (e)" text over items

### Gameplay

- [ ] during daytime, zombies should just wander around randomly, but will attack players if they get close
- [ ] if ALL players die, the game ends
- [ ] show a message that the players lost, and show a leaderboard with how many kills each player got
- [ ] add in melee weapon logic
- [ ] the guns should need ammo to fire
- [ ] a player should be able to pick up multiple guns (could later sell at the merchant or give other friends)
- [ ] items should have a weight associated with them
- [ ] your inventory weight should slow you down
- [ ] a player should be able to leave the game

### Stuff

- [ ] melee attack
- [ ] all players spawn with a random melee weapon
- [ ] lighting system (night cycle is pitch black, small fov near players)
- [ ] craft torch (wood, cloth, flint)
- [ ] place torch (acts as lighting)
- [ ] more base structures (spike floor trap, hurts zombies if they walk over it)
- [ ] zombies who vomit (range attack)
- [ ] ammo system

### HUD

- [ ] make the player health look nicer (could use hearts like zelda, or progress bar like in the game "dying light")
- [ ] add a nice indicator for the day / night cycle (could use a sun and moon icon; checkout don't starve together)

### Sounds

- [ ] before playing a new sound, determine distance from player and reduce volume if the sound was far away
- [ ] auto clean up sound entities after 5 seconds.
- [ ] add sound for shotgun
- [ ] add sound for knife
- [ ] add sound for player walking
- [ ] add sound for zombie walking
- [ ] add sound for player hurt
- [ ] add sound for zombie hurt
- [ ] add sound for zombie attack
- [ ] add sound for item pickup
- [ ] add sound for item craft
- [ ] add sound for item drop
- [ ] add sound for player death
- [ ] ambient background music that can be turned off

### Lobby

- [ ] a user shall be able to browse lobbies
- [ ] a user shall be able to join a lobby
- [ ] a user shall be able to create a new lobby
- [ ] a lobby leader shall be able to start the game
- [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)

### Map Generation

- [ ] create a "farm" zone which has a small farm building, a tractor, and trees
- [ ] create a "city" zone which has a building and roads
- [ ] create a "road" zone which is used to connect cities and farms (road going up or down)
- [ ] generate larger maps containing farms, cities, and roads that connect them.

## Medium Priority (Enhancements):

- [ ] a user shall be able to see a mini map which helps them know where they are
- [ ] a user can search a dead zombie body for items (randomly drop items)
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

## Change Log:

- [x] 12/15/2024: add a way to toggle the instructions on and off
- [x] 12/18/2024: when a player is killed, notify all players in the game a player has died
- [x] a user can drop items from their inventory
- [x] a user shall be able to harvest trees
- [x] create an entry point function for the client code which creates a canvas, connects to a server, and starts the game loop
- [x] a user shall be able to move their player around with w,s,a,d
- [x] a user shall be able to move in a diagonal direction
- [x] a user shall be able to attack using space
- [x] a user shall be able to see a health bar which shows how much health they have
- [x] create an next.js application which will use the client code to render the game
- [x] a user can move up, down, left, and right
- [x] create initial server logic for the game
- [x] a user should be able to pick up previously placed walls
- [x] a zombie can attack a player
- [x] add in collidable entities (barrels, boxes, etc.)
- [x] a user can hold one weapon at a time
- [x] add a day cycle which let's players explore, build, gather
- [x] add a basic night cycle which spawns zombies
- [x] a user can pick up wood and place into inventory
- [x] a user can build a barricade using wood
- [x] a user can fire in the direction they are facing
- [x] a zombie can attack walls (walls have hp)
- [x] picking up a damaged walled shouldn't restore it's health back to full when replacing
- [x] when picking up items, it should pick up the CLOSEST item first
- [x] the health bars need to be attached to the player group so that when they interpolate they don't lag behindw
- [x] a player shouldn't be able to move when crafting
- [x] fix the size of the wrench icon
- [x] figure out why the wrench icon becomes small when near a tree
- [x] close the crafting menu after making an item
- [x] a player shouldn't be able to open the craft menu when dead; also close it if they die while crafting
- [x] a player should drop all items when they die and scatter them around their body
- [x] the player should have a running animation (keep it simple), 2 frames with legs going up and down
- [x] every player faces the same direction as YOUR player which is a bug
- [x] the crafting recipe should be red or grayed out if you don't have enough items to craft it
- [x] pressing space while crafting an item you don't have enough resources to craft should not auto close the crafting menu
- [x] zombie should use walk animation as well
- [x] when a player is killed by a zombie, it seems like the zombie gets stuck either on the player, or thinks it still needs to attack the player
