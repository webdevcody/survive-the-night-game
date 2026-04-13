import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
import type { AuctionHouseSnapshotPayload } from "@shared/util/auction-types";
import type { ItemState } from "@shared/types/entity";
import type { AuctionMutationResultCode } from "@shared/util/auction-types";

const BASE = `${WEBSITE_API_URL}/api/game/auction-house`;

export type AuctionApiSnapshotResponse = {
  success: boolean;
  snapshot?: AuctionHouseSnapshotPayload;
  error?: string;
};

export type AuctionCreateResponse = {
  success: boolean;
  listingId?: string;
  snapshot?: AuctionHouseSnapshotPayload;
  code?: AuctionMutationResultCode;
};

export type AuctionBuyResponse = {
  success: boolean;
  code?: AuctionMutationResultCode;
  itemType?: string;
  itemState?: ItemState | null;
  pricePaid?: number;
  sellerUserId?: string;
  snapshot?: AuctionHouseSnapshotPayload;
};

export type AuctionCancelResponse = {
  success: boolean;
  code?: AuctionMutationResultCode;
  itemType?: string;
  itemState?: ItemState | null;
  snapshot?: AuctionHouseSnapshotPayload;
};

export type AuctionClaimResponse = {
  success: boolean;
  code?: AuctionMutationResultCode;
  coins?: number;
  snapshot?: AuctionHouseSnapshotPayload;
};

async function apiKeyHeaders(): Promise<HeadersInit | null> {
  if (!GAME_SERVER_API_KEY) {
    return null;
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": GAME_SERVER_API_KEY,
  };
}

export async function fetchAuctionSnapshot(userId: string): Promise<AuctionApiSnapshotResponse | null> {
  const headers = await apiKeyHeaders();
  if (!headers) {
    return null;
  }
  const url = `${BASE}?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn(`[auction-house-api] snapshot HTTP ${res.status}: ${t.slice(0, 400)}`);
    return { success: false, error: t };
  }
  return (await res.json()) as AuctionApiSnapshotResponse;
}

export async function postAuctionAction(body: Record<string, unknown>): Promise<any | null> {
  const headers = await apiKeyHeaders();
  if (!headers) {
    return null;
  }
  const res = await fetch(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn(`[auction-house-api] POST HTTP ${res.status}:`, data);
  }
  return data;
}
