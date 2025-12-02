/**
 * Get initials from a user's name for avatar fallback display.
 * @param name - The user's name (can be null)
 * @returns Up to 2 uppercase initials, or "?" if name is null/empty
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
