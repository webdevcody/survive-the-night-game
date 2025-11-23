# For once in my life, finish one single game!

Feel free to pick any item listed out here to work on.

## Bug

- if you pick up a wall that is damaged and put it back down, it seems to go back to full hp again.

- default stack size should be defined in configs instead on the server entities constants to make it easier to configure.

## DevEx

- ability to upgrade sentries, walls, spikes with gold
- walls just dissapear for some reason
- each player should be able to repair the car with their own cooldown
- scale the merchant menu on smaller screens
- force next round button
- all the item configs should reference the proper item sheets and remove "default" from all over the codebase. first start with any items that are set to "default", those need to be refactored, then refactor the javascript
- I need to refactor how the assets are managed. At the very least, throw an error if the same asset is loaded with the same asset key.
- check if the deserialize method on extensions is used, at this point we should only be using deserializeFromBuffer
- find an abstract method or class for projectiles as there is a lot of common functionality in terms of them traveling for X amount of distance, then needing to run some logic after that distance is reached, also similar groups they intersect with to damage. Maybe put arrow, knife, bullet, and grenade as similar type of projectiles when updating. the common logic is how they update, but there are difference in what happens when they go the max distance (a throwing knife and arrow will land on the ground to be picked up later, the grenade explodes with a timer so the max distance acts more as a potential trigger, bullet will travel a max distance as well).

## UX

- when the car is destroyed, change it to a broken car sprite display
- refactor how the car is defined in the editor. the car should not be part of the map but something in the entities list so it can be easily modified on death.

## Game Design

- new zombie types
  - a new zombie type who immobilizes you if hit
  - a new zombie type who can poison you
- figure out a better way to positions of the weapons so they look attached to the hands
- game mode: battle royal mode (1 player zombie, everyone else human)

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
