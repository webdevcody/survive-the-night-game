High Priority (Core Mechanics):

- [ ] a user shall be able to run using shift
- [ ] a user shall be able to see stamina bar which recharges slowly over time
- [ ] if all players die, the game ends
- [ ] show a message that the players lost, and show a leaderboard with how many kills each player got
- [ ] add in melee weapon logic
- [ ] when a player is killed, notify all players in the game a player has died
- [ ] players should be able to revive other dead players
- [ ] a user shall be able to browse lobbies
- [ ] a user shall be able to join a lobby
- [ ] a user shall be able to create a new lobby
- [ ] a lobby leader shall be able to start the game
- [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)

Medium Priority (Enhancements):

- [ ] a user shall be able to see a mini map which helps them know where they are
- [ ] a user can search a dead zombie body for items (randomly drop items)
- [ ] a user can search cabinets for items (randomly drop items)
- [ ] a user shall be able to view a mini map which helps them know where they are
- [ ] implement a fog of war effect in the mini map for unexplored areas
- [ ] add in lighting / flashlight (maybe look into shaders?)
- [ ] a player can pick a custom name to display over his head
- [ ] a player can chat with other players in their game via text

Low Priority (Polish):

- [ ] use scroll wheel instead of +/- buttons
- [ ] display user friendly message whenever there's a connection problem

Refactoring (Tech Debt Plz Fix):

- [ ] after saving game-client changes, the changes are not reflected in the dashboard until a hard refresh. it would be better if it was hot reloaded
- [ ] needing to place the images inside the next project when they belong to the client feels strange; I'm not sure if static asset bundling is a better approach
- [ ] sometimes auto import will not work depending on if you are editing a file in the client or server. It's like the types don't get picked up correctly between the sub projects.
- [ ] apply delta compression to the server game state updates

Completed (Let's GO!):

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
