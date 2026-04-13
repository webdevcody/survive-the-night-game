export const SIGN_MAX_MESSAGE_LENGTH = 280;

export function normalizeSignMessage(message: string): string {
  return message.replace(/\r\n?/g, "\n").slice(0, SIGN_MAX_MESSAGE_LENGTH).trim();
}

export function coerceSignMessage(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = normalizeSignMessage(raw);
  return normalized.length > 0 ? normalized : undefined;
}

/** Inventory / UI label so players can tell blank craftable signs from posted ones. */
export function getSignInventoryDisplayName(item: {
  itemType: string;
  state?: { message?: unknown };
}): string | null {
  if (item.itemType !== "sign") {
    return null;
  }
  return coerceSignMessage(item.state?.message) ? "Posted sign" : "Blank sign";
}
