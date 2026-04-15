import { SocketEventHandler } from "./types";
import { playerInputHandler } from "./player-input";
import { craftRequestHandler, startCraftingHandler, stopCraftingHandler } from "./craft";
import { setDisplayNameHandler } from "./display-name";
import { merchantBuyHandler, merchantSellHandler } from "./merchant";
import { requestFullStateHandler } from "./full-state";
import { requestPlayerIdHandler } from "./player-id";
import { pingHandler, pingUpdateHandler } from "./ping";
import { sendChatHandler } from "./chat";
import { placeStructureHandler } from "./structure";
import { playerRespawnRequestHandler } from "./respawn";
import { disconnectHandler } from "./disconnect";
import { dropItemHandler } from "./drop-item";
import { consumeItemHandler } from "./consume-item";
import { selectInventorySlotHandler } from "./select-inventory-slot";
import { swapInventoryItemsHandler } from "./swap-inventory-items";
import { swapBagAndEquipmentHandler } from "./swap-bag-and-equipment";
import { interactHandler } from "./interact";
import { changePlayerColorHandler } from "./change-player-color";
import { spawnZombieHandler } from "./spawn-zombie";
import { setProgressionAllocationsHandler } from "./set-progression-allocations";
import { selectWeaponLoadoutHandler } from "./select-weapon-loadout";
import { setWeaponLoadoutSlotHandler } from "./set-weapon-loadout-slot";
import { dialogueNpcCompleteHandler } from "./dialogue-npc-complete";
import { useLoadoutConsumableHandler } from "./use-loadout-consumable";
import { bankActionHandler } from "./bank-action";
import { reloadWeaponHandler } from "./reload-weapon";
import { requestCombatRollHandler } from "./request-combat-roll";
import { auctionActionHandler } from "./auction-action";
import { splitInventoryStackHandler } from "./split-inventory-stack";
import { setSignTextHandler } from "./set-sign-text";
import { pointerActivityHandler } from "./pointer-activity";

/**
 * Registry of all socket event handlers.
 * To add a new event handler:
 * 1. Create a handler file in this directory
 * 2. Export a SocketEventHandler object
 * 3. Import and add it to this array
 */
export const socketEventHandlers: SocketEventHandler[] = [
  playerInputHandler,
  craftRequestHandler,
  startCraftingHandler,
  stopCraftingHandler,
  setDisplayNameHandler,
  merchantBuyHandler,
  merchantSellHandler,
  requestFullStateHandler,
  requestPlayerIdHandler,
  pingHandler,
  pingUpdateHandler,
  sendChatHandler,
  placeStructureHandler,
  playerRespawnRequestHandler,
  disconnectHandler,
  dropItemHandler,
  consumeItemHandler,
  selectInventorySlotHandler,
  swapInventoryItemsHandler,
  swapBagAndEquipmentHandler,
  interactHandler,
  changePlayerColorHandler,
  spawnZombieHandler,
  setProgressionAllocationsHandler,
  selectWeaponLoadoutHandler,
  setWeaponLoadoutSlotHandler,
  dialogueNpcCompleteHandler,
  useLoadoutConsumableHandler,
  bankActionHandler,
  reloadWeaponHandler,
  requestCombatRollHandler,
  auctionActionHandler,
  splitInventoryStackHandler,
  setSignTextHandler,
  pointerActivityHandler,
];
