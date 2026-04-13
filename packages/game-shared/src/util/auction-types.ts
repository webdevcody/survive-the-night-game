import type { ItemState } from "../types/entity";
import type { InventoryItem } from "./inventory";

/** Single listing row in an auction snapshot (server → client). */
export interface AuctionListingSnapshot {
  id: string;
  itemType: string;
  itemState?: ItemState;
  price: number;
  itemCategory: string;
  /** True when the viewing player's account owns this listing. */
  isOwnListing: boolean;
}

export interface AuctionHouseSnapshotPayload {
  listings: AuctionListingSnapshot[];
  claimableCoins: number;
  /** Echo of request: result of last mutation, or "ok" after refresh. */
  resultCode?: AuctionMutationResultCode;
  message?: string;
}

export type AuctionMutationResultCode =
  | "ok"
  | "alreadySold"
  | "notFound"
  | "notOwner"
  | "cannotBuyOwnListing"
  | "noClaimableCoins"
  | "invalidPrice"
  | "cannotListItem"
  | "notAuthenticated"
  | "inventoryFull"
  | "insufficientCoins"
  | "busy"
  | "serverError";

/** Client → server auction request (binary + JSON-compatible). */
export type AuctionActionKind = "snapshot" | "list" | "buy" | "cancel" | "claim";

export interface AuctionActionPayload {
  auctionHouseEntityId: number;
  kind: AuctionActionKind;
  /** Bag slot when kind === "list". */
  bagSlotIndex?: number;
  price?: number;
  listingId?: string;
}

export const AUCTION_MAX_PRICE = 999_999_999;
export const AUCTION_MIN_PRICE = 1;

export function clampAuctionPrice(raw: number): number {
  if (!Number.isFinite(raw)) return AUCTION_MIN_PRICE;
  const n = Math.floor(raw);
  return Math.max(AUCTION_MIN_PRICE, Math.min(AUCTION_MAX_PRICE, n));
}

/** Whether a bag slot item may be listed (not empty, not coin). */
export function canListItemFromBag(item: InventoryItem | null | undefined): boolean {
  if (!item) return false;
  if (item.itemType === "coin") return false;
  return true;
}
