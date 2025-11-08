import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function meta() {
  return [
    { title: "Survive the Night - Multiplayer Zombie Survival Game" },
    {
      name: "description",
      content:
        "An online multiplayer game where you must survive the night against hordes of zombies. Build bases with your friends, collect weapons, and craft items to see how long you'll last.",
    },
  ];
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "0.8.0",
    date: "2025-11-08",
    changes: [
      "Removed player revival system - players can no longer revive each other.",
      "Added individual player respawn system with 'Press any key to respawn' prompt.",
      "Players now respawn at the campsite with full health when they press any key after dying.",
      "Inventory is cleared on death and items remain scattered on the ground.",
      "Death screen displays with semi-transparent overlay when player dies.",
      "Added mouse aiming for weapons - aim with cursor and click to shoot.",
      "Players can now aim in any direction independent of movement direction.",
      "Improved weapon firing mechanics with precise angle-based targeting.",
    ],
  },
  {
    version: "0.7.1",
    date: "2025-11-08",
    changes: [
      "Players no longer emit light unless they have a torch equipped.",
      "Torches must now be actively selected to provide illumination.",
      "Improved lighting system performance by filtering out entities with no light radius.",
      "Enhanced strategic gameplay - players must choose between weapons and visibility.",
      "Minimap fog of war now respects player lighting (only reveals areas when torch is equipped).",
    ],
  },
  {
    version: "0.7.0",
    date: "2025-11-08",
    changes: [
      "Replaced day/night cycle with wave-based gameplay system.",
      "Game now features timed waves with preparation periods between zombie attacks.",
      "Added wave timer HUD display showing current wave number and time until next wave.",
      "Implemented idle zombie behavior - zombies now wander around when not chasing players.",
      "Zombies exhibit more dynamic movement patterns during waves.",
      "Added map darkness overlay for enhanced atmosphere and visibility challenge.",
      "Darkness effect creates more tension during zombie waves.",
      "Refactored map rendering system for improved performance and maintainability.",
      "Optimized chunk rendering and camera viewport calculations.",
    ],
  },
  {
    version: "0.6.0",
    date: "2025-11-07",
    changes: [
      "Added Sentry Gun craftable item that automatically targets and shoots zombies.",
      "Sentry guns can be placed using the interactive placement system.",
      "Sentry guns have 360-degree detection radius and automatically engage zombies within range.",
      "Added campfire sprite and decal system for enhanced visual detail.",
      "Decals can now be placed in the map editor for decorative elements.",
      "New DecalsPanel in the map editor allows browsing and placing decal sprites.",
      "Campfire decal added to campsite biomes for improved atmosphere.",
    ],
  },
  {
    version: "0.5.0",
    date: "2025-11-07",
    changes: [
      "Added interactive wall placement system with mouse targeting.",
      "Walls can now be placed by selecting them from inventory and clicking on the map.",
      "Ghost template preview shows valid (green) and invalid (red) placement locations.",
      "Walls snap to 16x16 pixel grid for clean alignment.",
      "Placement range limited to 100 pixels from player with visual range indicator.",
      "Server validates all placements to prevent cheating and ensure fair gameplay.",
      "Placement blocked on occupied tiles, near entities, or outside map bounds.",
    ],
  },
  {
    version: "0.4.2",
    date: "2025-11-07",
    changes: [
      "Improved client-side prediction to reduce player drift during movement.",
      "Added continuous gentle correction that pulls player towards server position while moving.",
      "Simplified reconciliation system by removing adaptive lerp in favor of fixed correction speeds.",
      "Direction changes now feel more accurate with less visible drift accumulation.",
    ],
  },
  {
    version: "0.4.1",
    date: "2025-11-07",
    changes: [
      "Refactored instructions menu to remove dark background overlay.",
      "Instructions menu now toggles when clicking the settings button.",
      "Added click-outside-to-close functionality for instructions menu.",
    ],
  },
  {
    version: "0.4.0",
    date: "2025-11-07",
    changes: [
      "Fixed game inputs triggering while typing in UI input fields (spawn panel, config panel, etc.).",
    ],
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center pt-12 pb-16">
          {/* Game Title */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.6)] tracking-tight mb-4">
              SURVIVE THE NIGHT
            </h1>
            <p className="text-lg md:text-xl text-gray-400">
              Can you make it until dawn?
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <Link to="/play">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-6 text-lg shadow-lg shadow-red-900/50 transition-all hover:shadow-red-900/70 hover:scale-105"
              >
                Join Game
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button
                size="lg"
                className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-red-600 text-white font-bold px-10 py-6 text-lg transition-all shadow-md"
              >
                Leaderboard
              </Button>
            </Link>
            <a href="https://github.com/webdevcody/survive-the-night-game" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-red-600 text-white font-bold px-10 py-6 text-lg transition-all shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </Button>
            </a>
          </div>

          {/* Game Description */}
          <div className="max-w-3xl">
            <p className="text-gray-400 text-base md:text-lg leading-relaxed">
              Team up with friends in this intense multiplayer survival game. Gather resources,
              craft weapons, build defenses, and fight waves of zombies that grow stronger each night.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-b from-slate-950 via-slate-900 to-black px-6 text-sm font-semibold text-red-500 uppercase tracking-wider">
              Latest Updates
            </span>
          </div>
        </div>

        {/* Changelog Section */}
        <div className="pb-16">
          <div className="max-w-5xl mx-auto space-y-5">
            {changelog.map((entry, index) => (
              <div
                key={entry.version}
                className={`group relative bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm rounded-xl border transition-all duration-300 overflow-hidden
                  ${index === 0
                    ? "border-red-600/40 shadow-lg shadow-red-950/20 hover:shadow-red-950/40"
                    : "border-slate-800 hover:border-slate-700"
                  }`}
              >
                {/* Version Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 bg-slate-950/50 border-b border-slate-800/50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xl sm:text-2xl font-bold ${index === 0 ? "text-red-500" : "text-red-600"}`}>
                      v{entry.version}
                    </span>
                    {index === 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg">
                        LATEST
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">{entry.date}</span>
                </div>

                {/* Changes List */}
                <div className="px-5 sm:px-6 py-5">
                  <ul className="space-y-2.5">
                    {entry.changes.map((change, changeIndex) => (
                      <li
                        key={changeIndex}
                        className="flex items-start gap-3 text-sm sm:text-base text-gray-300 leading-relaxed"
                      >
                        <span className="text-red-500 mt-1.5 flex-shrink-0 text-xs">●</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-slate-900">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link to="/privacy" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-700">•</span>
            <Link to="/terms" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            Built with React Router 7 • Socket.io • Canvas 2D
          </p>
        </div>
      </div>
    </div>
  );
}
