Cody Tasks:

- [x] a user shall be able to harvest trees

Refactor:

- [ ] needing to place the images inside the next project when they belong to the client feels strange; I'm not sure if static asset bundling is a better approach
- [ ] sometimes auto import will not work depending on if you are editing a file in the client or server. It's like the types don't get picked up correctly between the sub projects.

Other Tasks:

- [ ] use scroll wheel instead of +/- buttons

DevEx:

- [ ] after saving game-client changes, the changes are not reflected in the dashboard until a hard refresh. it would be better if it was hot reloaded

Backlog:

- client
  - [x] create an entry point function for the client code which creates a canvas, connects to a server, and starts the game loop
  - [x] a user shall be able to move their player around with w,s,a,d
  - [x] a user shall be able to move in a diagonal direction
  - [x] a user shall be able to attack using space
  - [ ] a user shall be able to see a mini map which helps them know where they are
  - [ ] a user shall be able to see a health bar which shows how much health they have
  - [ ] a user shall be able to run using shift
  - [ ] a user shall be able to see stamina bar which recharges slowly over time
  - [ ] display user friendly message whenever there's a connection problem
- dashboard
  - [x] create an next.js application which will use the client code to render the game
  - [ ] a user shall be able to browse lobbies
  - [ ] a user shall be able to join a lobby
  - [ ] a user shall be able to create a new lobby
  - [ ] a lobby leader shall be able to start the game
  - [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)
- master server
  - [ ] a user should be able to connect to master server to fetch a list of available servers to play
  - [ ] a server owner should be able to connect to master server and broadcast to all players that they can play on it
- server
  - [x] create initial server logic for the game
  - [ ] the game server should be able to handle multiple active games
  - [ ] when the lobby starts, the game server should spin up a new game instance and register all connections to the new game
  - [ ] communication between server/client should be encoded and sent as binary to improve performance
  - [ ] apply delta compression to the server game state updates
  - [ ] on game start, load the map and spawn all players in the map, assign connection ids to the player entities so they know who they are controlling
  - [ ] start the "day" cycle which allows 5 minutes for players to build, explore, and gather resources
  - [ ] start the "night" cycle which spawns waves of zombies for 5 minutes which the players need to survive
  - [ ] when a player dies, they can be revived by other players if they hold E on them for 5 seconds
  - [ ] if all players die, the game ends
  - [ ] when a player is killed, notify all players in the game a player has died
  - [ ] a user shall be able to view a mini map which helps them know where they are
  - [ ] a user can cut down trees which drops wood
  - [ ] a user can pick up wood which puts it in their inventory
  - [ ] a user can build a barricade with wood which have 10 hp and forces the zombies to attack the barricade before they can get to the players. The barricade does not block path finding, meaning zombies will intentially try to run into them if it's the best path between them and the player.
  - [x] a user can move up, down, left, and right
  - [ ] a user can fire in the direction they are facing
  - [ ] a user should be able to destroy barricades (if they are stuck, hold X for 3 seconds)
  - [ ] a user can drop items from their inventory
  - [ ] a user can hold one weapon at a time
  - [ ] a user spawns with a baseball bat (melee weapon, slow attack speed, has knock back)
  - [ ] a user can search a dead zombie body for items (randomly drop items)
  - [ ] a user can search cabinets for items (randomly drop items)
  - [ ] a zombie can attack a player (when they get close enough to a player, we need an attack animation and only hurt the player if they close enough by the time the animation reaches a certain point)
  - [ ] add in lighting / flashlight (maybe look into shaders?)
  - [ ] add in collidable entities (barrels, boxes, etc.)
