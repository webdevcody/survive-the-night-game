import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { database } from "~/db";
import { auctionHouseListing, userStats } from "~/db/schema";
import type { ItemState } from "@survive-the-night/game-shared/types/entity";
import type {
  AuctionHouseSnapshotPayload,
  AuctionListingSnapshot,
  AuctionMutationResultCode,
} from "@survive-the-night/game-shared/util/auction-types";

export async function getAuctionSnapshotForUser(userId: string): Promise<AuctionHouseSnapshotPayload> {
  const statsRow = await database
    .select({ claimable: userStats.auctionClaimableCoins })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);
  const claimableCoins = statsRow[0]?.claimable ?? 0;

  const rows = await database
    .select()
    .from(auctionHouseListing)
    .where(eq(auctionHouseListing.status, "active"));

  const listings: AuctionListingSnapshot[] = rows.map((r) => ({
    id: r.id,
    itemType: r.itemType,
    itemState: r.itemState ?? undefined,
    price: r.price,
    itemCategory: r.itemCategory,
    isOwnListing: r.sellerUserId === userId,
  }));

  return { listings, claimableCoins, resultCode: "ok" };
}

export async function insertAuctionListing(params: {
  id: string;
  sellerUserId: string;
  itemType: string;
  itemState: ItemState | null | undefined;
  price: number;
  itemCategory: string;
}): Promise<void> {
  await database.insert(auctionHouseListing).values({
    id: params.id,
    sellerUserId: params.sellerUserId,
    itemType: params.itemType,
    itemState: params.itemState ?? null,
    price: params.price,
    itemCategory: params.itemCategory,
    status: "active",
  });
}

export async function createAuctionListingWithId(params: {
  sellerUserId: string;
  itemType: string;
  itemState: ItemState | null | undefined;
  price: number;
  itemCategory: string;
}): Promise<{ ok: true; listingId: string } | { ok: false; code: AuctionMutationResultCode }> {
  const listingId = randomUUID();
  try {
    await insertAuctionListing({
      id: listingId,
      sellerUserId: params.sellerUserId,
      itemType: params.itemType,
      itemState: params.itemState,
      price: params.price,
      itemCategory: params.itemCategory,
    });
    return { ok: true, listingId };
  } catch (e) {
    console.error("[auction-house] insert listing failed:", e);
    return { ok: false, code: "serverError" };
  }
}

export type BuyAuctionListingSuccess = {
  ok: true;
  sellerUserId: string;
  price: number;
  itemType: string;
  itemState: ItemState | null;
};

export type BuyAuctionListingResult =
  | BuyAuctionListingSuccess
  | { ok: false; code: AuctionMutationResultCode };

export async function buyAuctionListing(
  listingId: string,
  buyerUserId: string,
): Promise<BuyAuctionListingResult> {
  try {
    return await database.transaction(async (tx) => {
      const found = await tx
        .select()
        .from(auctionHouseListing)
        .where(eq(auctionHouseListing.id, listingId))
        .for("update");

      const row = found[0];
      if (!row) {
        return { ok: false, code: "notFound" };
      }
      if (row.status !== "active") {
        return { ok: false, code: "alreadySold" };
      }
      if (row.sellerUserId === buyerUserId) {
        return { ok: false, code: "cannotBuyOwnListing" };
      }

      await tx
        .update(auctionHouseListing)
        .set({
          status: "sold",
          buyerUserId,
          soldAt: new Date(),
        })
        .where(and(eq(auctionHouseListing.id, listingId), eq(auctionHouseListing.status, "active")));

      await tx
        .update(userStats)
        .set({
          auctionClaimableCoins: sql`${userStats.auctionClaimableCoins} + ${row.price}`,
          updatedAt: new Date(),
        })
        .where(eq(userStats.userId, row.sellerUserId));

      return {
        ok: true,
        sellerUserId: row.sellerUserId,
        price: row.price,
        itemType: row.itemType,
        itemState: row.itemState,
      };
    });
  } catch (e) {
    console.error("[auction-house] buy transaction failed:", e);
    return { ok: false, code: "serverError" };
  }
}

export type CancelAuctionListingSuccess = {
  ok: true;
  itemType: string;
  itemState: ItemState | null;
};

export type CancelAuctionListingResult =
  | CancelAuctionListingSuccess
  | { ok: false; code: AuctionMutationResultCode };

export async function cancelAuctionListing(
  listingId: string,
  sellerUserId: string,
): Promise<CancelAuctionListingResult> {
  try {
    return await database.transaction(async (tx) => {
      const found = await tx
        .select()
        .from(auctionHouseListing)
        .where(eq(auctionHouseListing.id, listingId))
        .for("update");

      const row = found[0];
      if (!row) {
        return { ok: false, code: "notFound" };
      }
      if (row.sellerUserId !== sellerUserId) {
        return { ok: false, code: "notOwner" };
      }
      if (row.status !== "active") {
        return { ok: false, code: "alreadySold" };
      }

      await tx
        .update(auctionHouseListing)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(eq(auctionHouseListing.id, listingId));

      return {
        ok: true,
        itemType: row.itemType,
        itemState: row.itemState,
      };
    });
  } catch (e) {
    console.error("[auction-house] cancel transaction failed:", e);
    return { ok: false, code: "serverError" };
  }
}

export type ClaimAuctionProceedsSuccess = { ok: true; coins: number };

export type ClaimAuctionProceedsResult =
  | ClaimAuctionProceedsSuccess
  | { ok: false; code: AuctionMutationResultCode };

export async function claimAuctionProceeds(userId: string): Promise<ClaimAuctionProceedsResult> {
  try {
    return await database.transaction(async (tx) => {
      const locked = await tx
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .for("update");

      const row = locked[0];
      const amt = row?.auctionClaimableCoins ?? 0;
      if (amt <= 0) {
        return { ok: false, code: "noClaimableCoins" };
      }

      await tx
        .update(userStats)
        .set({
          auctionClaimableCoins: 0,
          updatedAt: new Date(),
        })
        .where(eq(userStats.userId, userId));

      return { ok: true, coins: amt };
    });
  } catch (e) {
    console.error("[auction-house] claim transaction failed:", e);
    return { ok: false, code: "serverError" };
  }
}
