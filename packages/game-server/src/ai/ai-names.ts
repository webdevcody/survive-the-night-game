/**
 * Human-like name generation for AI players
 */

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Taylor",
  "Quinn",
  "Avery",
  "Blake",
  "Cameron",
  "Drew",
  "Emery",
  "Finley",
  "Harper",
  "Jamie",
  "Kendall",
  "Logan",
  "Mason",
  "Nico",
  "Parker",
  "Reese",
  "Sage",
  "Tyler",
  "Winter",
  "Max",
  "Sam",
  "Charlie",
  "Dakota",
  "Skyler",
  "Phoenix",
];

const NAME_SUFFIXES = [
  "",
  "_",
  "99",
  "2024",
  "Pro",
  "XD",
  "007",
  "GG",
  "YT",
  "TTV",
  "123",
  "_x",
  "x_",
  "1",
  "42",
  "Jr",
  "_btw",
  "OP",
  "MVP",
  "Boss",
];

// Track used names to avoid duplicates within a game session
const usedNames = new Set<string>();

/**
 * Generate a human-like display name for an AI player
 * Names are formatted to look like typical online game usernames
 */
export function generateHumanName(): string {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const name = `${firstName}${suffix}`;

    // Ensure name is not too long (max 12 chars to match player name limit)
    if (name.length <= 12 && !usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }

  // Fallback with random number if all names are taken
  const fallbackName = `Bot${Math.floor(Math.random() * 10000)}`;
  usedNames.add(fallbackName);
  return fallbackName;
}

/**
 * Reset used names (call at start of new game)
 */
export function resetUsedNames(): void {
  usedNames.clear();
}
