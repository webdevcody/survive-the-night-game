/**
 * Formats a name by replacing underscores with spaces and converting to title case
 * @param name - The name to format (e.g., "pistol_ammo" or "baseball_bat")
 * @returns Formatted name (e.g., "Pistol Ammo" or "Baseball Bat")
 */
export function formatDisplayName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

