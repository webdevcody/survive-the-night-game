import { createFileRoute } from "@tanstack/react-router";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";
import {
  buyAuctionListing,
  cancelAuctionListing,
  claimAuctionProceeds,
  createAuctionListingWithId,
  getAuctionSnapshotForUser,
} from "~/data-access/auction-house";
import { getAuctionItemCategory } from "@survive-the-night/game-shared/util/auction-item-category";
import {
  AUCTION_MAX_PRICE,
  AUCTION_MIN_PRICE,
  clampAuctionPrice,
  type AuctionHouseSnapshotPayload,
  type AuctionMutationResultCode,
} from "@survive-the-night/game-shared/util/auction-types";
import type { ItemState } from "@survive-the-night/game-shared/types/entity";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Game server ↔ website auction API (X-API-Key).
 * GET ?userId= — snapshot
 * POST { action, userId, ... } — mutations
 */
export const Route = createFileRoute("/api/game/auction-house")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) return authError;

          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");
          if (!userId) {
            return json({ success: false, error: "Missing userId" }, 400);
          }

          const snapshot = await getAuctionSnapshotForUser(userId);
          return json({ success: true, snapshot });
        } catch (e) {
          console.error("auction-house GET:", e);
          return json({ success: false, error: "Internal server error" }, 500);
        }
      },

      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) return authError;

          const body = (await request.json()) as {
            action?: unknown;
            userId?: unknown;
            itemType?: unknown;
            itemState?: unknown;
            price?: unknown;
            listingId?: unknown;
          };

          if (!body.userId || typeof body.userId !== "string") {
            return json({ success: false, error: "Missing userId" }, 400);
          }
          const userId = body.userId;

          const action = body.action;
          if (action === "snapshot") {
            const snapshot = await getAuctionSnapshotForUser(userId);
            const out: AuctionHouseSnapshotPayload = { ...snapshot, resultCode: "ok" };
            return json({ success: true, snapshot: out });
          }

          if (action === "createListing") {
            if (typeof body.itemType !== "string" || !body.itemType) {
              return json({ success: false, code: "cannotListItem" satisfies AuctionMutationResultCode }, 400);
            }
            const price =
              typeof body.price === "number" && Number.isFinite(body.price)
                ? clampAuctionPrice(body.price)
                : AUCTION_MIN_PRICE;
            if (price < AUCTION_MIN_PRICE || price > AUCTION_MAX_PRICE) {
              return json({ success: false, code: "invalidPrice" satisfies AuctionMutationResultCode }, 400);
            }
            let itemState: ItemState | null = null;
            if (body.itemState != null && typeof body.itemState === "object") {
              itemState = body.itemState as ItemState;
            }
            const itemCategory = getAuctionItemCategory(body.itemType);
            const created = await createAuctionListingWithId({
              sellerUserId: userId,
              itemType: body.itemType,
              itemState,
              price,
              itemCategory,
            });
            if (created.ok === false) {
              return json({ success: false, code: created.code }, 400);
            }
            const snapshot = await getAuctionSnapshotForUser(userId);
            return json({
              success: true,
              listingId: created.listingId,
              snapshot: { ...snapshot, resultCode: "ok" as const },
            });
          }

          if (action === "buy") {
            if (typeof body.listingId !== "string" || !body.listingId) {
              return json({ success: false, code: "notFound" satisfies AuctionMutationResultCode }, 400);
            }
            const result = await buyAuctionListing(body.listingId, userId);
            if (result.ok === false) {
              return json({ success: false, code: result.code, snapshot: await buildSnapshot(userId, result.code) }, 200);
            }
            const snapshot = await getAuctionSnapshotForUser(userId);
            return json({
              success: true,
              code: "ok" as const,
              itemType: result.itemType,
              itemState: result.itemState,
              pricePaid: result.price,
              sellerUserId: result.sellerUserId,
              snapshot: { ...snapshot, resultCode: "ok" },
            });
          }

          if (action === "cancel") {
            if (typeof body.listingId !== "string" || !body.listingId) {
              return json({ success: false, code: "notFound" satisfies AuctionMutationResultCode }, 400);
            }
            const result = await cancelAuctionListing(body.listingId, userId);
            if (result.ok === false) {
              return json({ success: false, code: result.code, snapshot: await buildSnapshot(userId, result.code) }, 200);
            }
            const snapshot = await getAuctionSnapshotForUser(userId);
            return json({
              success: true,
              code: "ok" as const,
              itemType: result.itemType,
              itemState: result.itemState,
              snapshot: { ...snapshot, resultCode: "ok" },
            });
          }

                   if (action === "claim") {
            const result = await claimAuctionProceeds(userId);
            if (result.ok === false) {
              return json({ success: false, code: result.code, snapshot: await buildSnapshot(userId, result.code) }, 200);
            }
            const snapshot = await getAuctionSnapshotForUser(userId);
            return json({
              success: true,
              code: "ok" as const,
              coins: result.coins,
              snapshot: { ...snapshot, resultCode: "ok" },
            });
          }

          return json({ success: false, error: "Unknown action" }, 400);
        } catch (e) {
          console.error("auction-house POST:", e);
          return json({ success: false, error: "Internal server error" }, 500);
        }
      },
    },
  },
});

async function buildSnapshot(
  userId: string,
  resultCode: AuctionMutationResultCode,
): Promise<AuctionHouseSnapshotPayload> {
  const base = await getAuctionSnapshotForUser(userId);
  return { ...base, resultCode, message: undefined };
}
