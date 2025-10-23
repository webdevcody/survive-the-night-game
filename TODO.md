# REAL HIGH PRIORITY

- [ ] find a better way to abstract the code around a weapon decrementing ammo and removing the ammo from the player's inventory when they run out.
- [ ] look into where we have to update the code just to add a new zombie type, simplify it if possible
- [ ] look into where we have to update the code just to add a new entity type, simplify it if possible

# BUGS

- [ ] sometimes the pings become negative on the leaderboard
- [ ] figure out a better approach for difficulting scaling, because when 20 people are in the game, it spawns like 100 zombies, and it's too hard
- [ ] make the day time longer

# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

### Stream TODO

## High Priority (Core Mechanics):

- [ ] larger maps
- [ ] fix craft

### Refactoring

- [ ] "@/_": ["./src/_", "../game-shared/src/\*"], figure out why in server tsconfig.json, I need this for tests to pass

- [ ] add client sent package side validation
- [ ] setup a vitest.config.ts file in the test directory so that absolute imports don't break everything
- [ ] refactor the use the new style sheets I created using aseprite
- [ ] for renderInteractionText, can we bake this into the extension or ClientEntity so that it'll automatically display the render text if the player is close enough?
- [ ] refactor the player update method, it's complex, and also abstract the way we handle the fired weapon
- [ ] refactor the z ordering by sorting the entities by y position (on top of the z index rendering, go to Renderer)
- [ ] THERE ARE TOO MANY PLACES TO UPDATE WHEN I ADD NEW EXTENSIONS
- [ ] THERE ARE TOO MANY PLACES TO UPDATE WHEN I ADD NEW ENTITY
- [ ] I'm noticing that we use GenericEntity and Entity on some of the extensions? which one should extensions know about? I'm ok using Entity, but I wasn't sure if there was a reason for the GenericEntity.
- [ ]
- [ ] the velocity / position updating should be in an extension to make it reusable (see the bullet entity for an example)
- [ ] I shouldn't need to manually call combustible.onDeath() when the zombie dies - lean into event emitters more if possible
      d- [ ] there is a lot of duplicate code related to showing the "pickup (e)" text over items
- [ ] there is a lot of places I have to manually update when I add new entities (refactor this)
- [ ] why does positionable have a size? remove if not necessary
- [ ] find a way to reduce the amount of duplicate code
- [ ] the client entities feels very duplicates to the server entities, find a way reuse code maybe?
- [ ] sometimes when doing @ imports, the entire app breaks forcing us to use relative... figure out why
- [ ] serialize should be more automated, I often forget to update it when I add new properties
- [ ] rename hotbar to item belt

### Bugs

- [ ] when DEBUG = true, all the HUD overlays seem to shift, including the "pickup (e)" text over items

### Gameplay

- [ ] add throwable items (grenades to start with)
- [ ] decoy items (a fire cracker to distract zombies)
- [ ] potion items (health, speed, invincibility, etc.)

- [ ] zombie that can only be damanged while on fire zombie in a firefighter outfit
- [ ] show a message that the players lost, and show a leaderboard with how many kills each player got
- [ ] add in melee weapon logic
- [ ] the guns should need ammo to fire
- [ ] a player should be able to pick up multiple guns (could later sell at the merchant or give other friends)
- [ ] items should have a weight associated with them
- [ ] your inventory weight should slow you down
- [ ] a player should be able to leave the game

### Stuff

- [ ] all players spawn with a random melee weapon
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
- [ ] add sound for knife
- [ ] add sound for player walking
- [ ] add sound for zombie walking
- [ ] add sound for zombie attack
- [ ] add sound for item craft
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

- [ ] air drops (randomly drop crates around the map when day starts)
- [ ] a user shall be able to see a mini map which helps them know where they are
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

- [x] 10/22/2025: add an exploding zombie

- [x] 1/4/2025: a player shouldn't be colliding with a dead zombie
- [x] 1/4/2025: fix bullet from coming out of players head
- [x] 1/4/2025: a bullet was not blowing up the gas can (because I forgot to add the groupable extension to the gas can)
- [x] 1/4/2025: a user can search a dead zombie body for items (randomly drop items)
- [x] 1/4/2025: a zombie should be lootable, but the label isn't showing
- [x] 1/4/2025: refactor the zombie constructor

- [x] 12/19/2024: add sound for shotgun
- [x] 12/19/2024: add sound for player hurt
- [x] 12/19/2024: add sound for zombie hurt
- [x] 12/19/2024: add sound for item pickup
- [x] 12/19/2024: add sound for item drop
- [x] 12/19/2024: add sound for player death
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
- [x] a player is able to shoot themself, this is bad
