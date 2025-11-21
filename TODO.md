# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## Bug

- if you pick up a wall that is damaged and put it back down, it seems to go back to full hp again.

## DevEx

- the approach for compression is very hacky, find a more elegant solution

## UX

- when the car is destroyed, change it to a broken car sprite display
- refactor how the car is defined in the editor. the car should not be part of the map but something in the entities list so it can be easily modified on death.

## Game Design

- gasoline and torch need to be configured to be on the items sheet
- all items should live on the items sheet
- new zombie types
  - a new zombie type who immobilizes you if hit
  - a new zombie type who can poison you
- remove decal idea from map
- Could not spawn all zombies at location (1136, 848)
- ​​add gate that works like wall but users can go through while zombies not
- combine weapon / ammo in hud so it's easier to read how much you got left
- figure out a better way to positions of the weapons so they look attached to the hands
- game mode: battle royal mode (1 player zombie, everyone else human)
- do not play walking animation for surviver when they are non rescued
- on death, a player will now turn into a zombie. plan and implement this implementation. player zombies will spawn on the outskirts of the map.
- have a weapon menu separate from inventory
- changing items with scroll bar would be useful
- I agree, having a semi-translucened circurar weapon inventory would look cool, it would enable to quickly changing weapons.

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
