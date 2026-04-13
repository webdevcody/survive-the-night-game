import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import type { AuctionActionEventData } from "@shared/events/client-sent/events/auction-action";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { Player } from "@/entities/players/player";
import { Entities } from "@shared/constants";
import { distance } from "@shared/util/physics";
import { getConfig } from "@shared/config";
import { UserSessionCache } from "@/services/user-session-cache";
import {
  fetchAuctionSnapshot,
  postAuctionAction,
} from "@/services/auction-house-api";
import { AuctionSnapshotEvent } from "@shared/events/server-sent/events/auction-snapshot-event";
import { sendPlayerHudMessage } from "@/util/send-player-hud-message";
import {
  canBagAcceptCoinCount,
  canBagAcceptItem,
  isStackableInventoryItem,
  type InventoryItem,
} from "@shared/util/inventory";
import {
  canListItemFromBag,
  clampAuctionPrice,
  type AuctionHouseSnapshotPayload,
} from "@shared/util/auction-types";
import { itemRegistry } from "@shared/entities/item-registry";
import type { AuctionMutationResultCode } from "@shared/util/auction-types";

const inflightSockets = new Set<string>();

function assertAuctionHouseInRange(player: Player, entityId: number): boolean {
  const ent = player.getEntityManager().getEntityById(entityId);
  if (!ent || !ent.hasExt(Positionable)) {
    return false;
  }
  if (ent.getType() !== Entities.AUCTION_HOUSE) {
    return false;
  }
  return (
    distance(
      player.getCenterPosition(),
      ent.getExt(Positionable).getCenterPosition(),
    ) <= getConfig().player.MAX_INTERACT_RADIUS
  );
}

function validatePayload(data: unknown): AuctionActionEventData | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const o = data as Record<string, unknown>;
  const id = o.auctionHouseEntityId;
  const kind = o.kind;
  const bagSlotIndex = o.bagSlotIndex;
  const price = o.price;
  const listingId = o.listingId;
  const rawLq = o.listQuantity;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0) {
    return null;
  }
  if (
    kind !== "snapshot" &&
    kind !== "list" &&
    kind !== "buy" &&
    kind !== "cancel" &&
    kind !== "claim"
  ) {
    return null;
  }
  if (typeof bagSlotIndex !== "number" || !Number.isInteger(bagSlotIndex) || bagSlotIndex < 0) {
    return null;
  }
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return null;
  }
  if (typeof listingId !== "string") {
    return null;
  }
  const listQuantity =
    typeof rawLq === "number" && Number.isFinite(rawLq) && rawLq >= 0
      ? Math.min(0xffff_ffff, Math.floor(rawLq))
      : 0;
  return {
    auctionHouseEntityId: id,
    kind,
    bagSlotIndex,
    price,
    listingId,
    listQuantity,
  };
}

function itemLabel(itemType: string): string {
  const cfg = itemRegistry.get(itemType);
  return (cfg as { id?: string } | undefined)?.id?.replace(/_/g, " ") ?? itemType;
}

async function pushSnapshot(
  context: HandlerContext,
  socket: ISocketAdapter,
  userId: string,
  resultCode?: AuctionMutationResultCode,
  message?: string,
): Promise<void> {
  const remote = await fetchAuctionSnapshot(userId);
  let snapshot: AuctionHouseSnapshotPayload;
  if (remote?.success && remote.snapshot) {
    snapshot = {
      ...remote.snapshot,
      resultCode: resultCode ?? remote.snapshot.resultCode ?? "ok",
      message,
    };
  } else {
    snapshot = {
      listings: [],
      claimableCoins: 0,
      resultCode: resultCode ?? "serverError",
      message: message ?? remote?.error,
    };
  }
  context.sendEventToSocket(socket, new AuctionSnapshotEvent(snapshot));
}

export async function onAuctionAction(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: AuctionActionEventData,
): Promise<void> {
  const player = context.players.get(socket.id);
  if (!player || player.isZombie()) {
    return;
  }

  if (!assertAuctionHouseInRange(player, data.auctionHouseEntityId)) {
    return;
  }

  const userId = UserSessionCache.getInstance().getUserIdBySocket(socket.id);
  if (!userId) {
    context.sendEventToSocket(
      socket,
      new AuctionSnapshotEvent({
        listings: [],
        claimableCoins: 0,
        resultCode: "notAuthenticated",
        message: "Sign in to use the auction house.",
      }),
    );
    return;
  }

  if (inflightSockets.has(socket.id)) {
    await pushSnapshot(context, socket, userId, "busy", "Please wait.");
    return;
  }

  inflightSockets.add(socket.id);
  try {
    const inv = player.getExt(Inventory);
    const maxSlots = inv.getMaxSlots();
    const bag = inv.getItems();

    if (data.kind === "snapshot") {
      await pushSnapshot(context, socket, userId);
      return;
    }

    if (data.kind === "list") {
      const slot = data.bagSlotIndex;
      if (slot < 0 || slot >= maxSlots) {
        await pushSnapshot(context, socket, userId, "cannotListItem");
        return;
      }
      const item = bag[slot];
      if (!canListItemFromBag(item)) {
        await pushSnapshot(context, socket, userId, "cannotListItem");
        return;
      }
      const price = clampAuctionPrice(data.price);
      const stackSize = item.state?.count ?? 1;
      const stackable = isStackableInventoryItem(item);
      const rawQty = data.listQuantity;
      let take: number;
      if (!stackable) {
        take = 1;
      } else if (rawQty <= 0) {
        take = stackSize;
      } else {
        take = Math.min(stackSize, Math.max(1, Math.floor(rawQty)));
      }

      let removed: InventoryItem | undefined;
      if (stackable && take < stackSize) {
        removed = inv.removeItemCountFromBagSlot(slot, take);
      } else {
        removed = inv.removeItem(slot);
      }
      if (!removed) {
        await pushSnapshot(context, socket, userId, "cannotListItem");
        return;
      }

      const res = await postAuctionAction({
        action: "createListing",
        userId,
        itemType: removed.itemType,
        itemState: removed.state ?? null,
        price,
      });

      if (!res?.success) {
        inv.addOrMergeStack(removed);
        await pushSnapshot(
          context,
          socket,
          userId,
          (res?.code as AuctionMutationResultCode) ?? "serverError",
        );
        return;
      }

      await pushSnapshot(context, socket, userId, "ok");
      return;
    }

    if (data.kind === "buy") {
      const listingId = data.listingId.trim();
      if (!listingId) {
        await pushSnapshot(context, socket, userId, "notFound");
        return;
      }

      const snap = await fetchAuctionSnapshot(userId);
      const listing = snap?.snapshot?.listings.find((l) => l.id === listingId);
      if (!listing) {
        await pushSnapshot(context, socket, userId, "notFound");
        return;
      }
      if (listing.isOwnListing) {
        await pushSnapshot(context, socket, userId, "cannotBuyOwnListing");
        return;
      }

      const pricePaid = listing.price;
      const boughtItem: InventoryItem = {
        itemType: listing.itemType,
        ...(listing.itemState != null ? { state: listing.itemState } : {}),
      };

      if (!canBagAcceptItem(bag, maxSlots, boughtItem)) {
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }
      const coins = inv.getTotalCount("coin");
      if (coins < pricePaid) {
        await pushSnapshot(context, socket, userId, "insufficientCoins");
        return;
      }

      const res = await postAuctionAction({
        action: "buy",
        userId,
        listingId,
      });

      if (!res?.success) {
        await pushSnapshot(
          context,
          socket,
          userId,
          (res?.code as AuctionMutationResultCode) ?? "serverError",
        );
        return;
      }

      if (!inv.removeCountAcrossStacks("coin", pricePaid)) {
        await pushSnapshot(context, socket, userId, "insufficientCoins");
        return;
      }

      if (!inv.addOrMergeStack(boughtItem)) {
        inv.addOrMergeStack({ itemType: "coin", state: { count: pricePaid } });
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }

      const itemType = listing.itemType;
      const sellerUserId = res.sellerUserId as string | undefined;
      if (sellerUserId) {
        const sellerSocket = UserSessionCache.getInstance().getSocketIdByUser(sellerUserId);
        if (sellerSocket) {
          const sellerPlayer = context.players.get(sellerSocket);
          if (sellerPlayer) {
            sendPlayerHudMessage(
              context.getGameManagers(),
              sellerPlayer.getId(),
              `Auction house: ${itemLabel(itemType)} sold`,
            );
          }
        }
      }

      await pushSnapshot(context, socket, userId, "ok");
      return;
    }

    if (data.kind === "cancel") {
      const listingId = data.listingId.trim();
      if (!listingId) {
        await pushSnapshot(context, socket, userId, "notFound");
        return;
      }

      const snap0 = await fetchAuctionSnapshot(userId);
      const listing0 = snap0?.snapshot?.listings.find((l) => l.id === listingId);
      if (!listing0 || !listing0.isOwnListing) {
        await pushSnapshot(context, socket, userId, "notOwner");
        return;
      }

      const returned: InventoryItem = {
        itemType: listing0.itemType,
        ...(listing0.itemState != null ? { state: listing0.itemState } : {}),
      };

      if (!canBagAcceptItem(inv.getItems(), maxSlots, returned)) {
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }

      const res = await postAuctionAction({
        action: "cancel",
        userId,
        listingId,
      });

      if (!res?.success) {
        await pushSnapshot(
          context,
          socket,
          userId,
          (res?.code as AuctionMutationResultCode) ?? "serverError",
        );
        return;
      }

      if (!inv.addOrMergeStack(returned)) {
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }

      await pushSnapshot(context, socket, userId, "ok");
      return;
    }

    if (data.kind === "claim") {
      const pre = await fetchAuctionSnapshot(userId);
      const expected = pre?.snapshot?.claimableCoins ?? 0;
      if (expected <= 0) {
        await pushSnapshot(context, socket, userId, "noClaimableCoins");
        return;
      }
      if (!canBagAcceptCoinCount(inv.getItems(), maxSlots, expected)) {
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }

      const res = await postAuctionAction({
        action: "claim",
        userId,
      });

      if (!res?.success) {
        await pushSnapshot(
          context,
          socket,
          userId,
          (res?.code as AuctionMutationResultCode) ?? "serverError",
        );
        return;
      }

      const coins = typeof res.coins === "number" ? res.coins : 0;
      if (coins <= 0) {
        await pushSnapshot(context, socket, userId, "noClaimableCoins");
        return;
      }

      if (!inv.addOrMergeStack({ itemType: "coin", state: { count: coins } })) {
        await pushSnapshot(context, socket, userId, "inventoryFull");
        return;
      }

      await pushSnapshot(context, socket, userId, "ok");
    }
  } finally {
    inflightSockets.delete(socket.id);
  }
}

export const auctionActionHandler: SocketEventHandler<AuctionActionEventData> = {
  event: "AUCTION_ACTION",
  handler: (context, socket, payload) => {
    const validated = validatePayload(payload);
    if (!validated) {
      console.warn(`Invalid auction action from socket ${socket.id}`);
      return;
    }
    return onAuctionAction(context, socket, validated);
  },
};
