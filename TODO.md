# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## Bug

- if you pick up a wall that is damaged and put it back down, it seems to go back to full hp again.

## UX

- when the car is destroyed, change it to a broken car sprite display
- refactor how the car is defined in the editor. the car should not be part of the map but something in the entities list so it can be easily modified on death.

## Game Design

- a new melee weapon called baseball bat (longer range than knife, easier to kite enemies)
- add more gore for when zombies are shot or killed
- add more gore when player is killed
- play a repair sound when you repair the car
- the drop crates HUD is over the inventory, they should be under, change the render ordering to make the hud indicators be under all other UI elements
- hide the repair interaction text until the car's repair cooldown is ready
- a new zombie type who immobilizes you if hit
- a new zombie type who can poison you
- ​​add gate that works like wall but users can go through while zombies not
- play a sound when the wave starts
- complaints of a lack of ammo
- add back the ability to attack with space bar
- have a weapon menu separate from inventory
- changing items with scroll bar would be useful
- combine weapon / ammo in hud so it's easier to read how much you got left
- figure out a better way to positions of the weapons so they look attached to the hands
- game mode: battle royal mode (1 player zombie, everyone else human)
- play a siren noise and up battle music for the wave
- play a low tempo ambient music during non wave
- add sound for item craft
- a user can search gallon drums for items
- do not play walking animation for surviver when they are non rescued
- on death, a player will now turn into a zombie. plan and implement this implementation. player zombies will spawn on the outskirts of the map.

## Bug

- add ability to drag fullscreen map around with a click drag approach
- figure out why negative latencies are a thing in the leaderboard
- sometimes the shift / run gets stuck down and I have to press shift again to untoggle it

## Devex

- when the server updates, it doesn't auto refresh the users... just force reload their browser
- hook the configuration panel so that values propigate to the server as well so I don't have to restart the server when tweaking values
- proximity voice chat

## Lobby

- [ ] a user shall be able to browse lobbies
- [ ] a user shall be able to join a lobby
- [ ] a user shall be able to create a new lobby
- [ ] a lobby leader shall be able to start the game
- [ ] a lobby leader shall be able to leave the lobby (which will promote another user to the leader)
