import type { Route } from "./+types";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Changelog - Survive the Night" },
    {
      name: "description",
      content: "Version history and updates for Survive the Night game.",
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

export default function Changelog() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            � Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Changelog</h1>
          <p className="text-gray-400">
            Track the latest updates and improvements to Survive the Night
          </p>
        </div>

        <div className="space-y-8">
          {changelog.map((entry) => (
            <div key={entry.version} className="border-l-4 border-purple-500 pl-6 pb-8">
              <div className="flex items-baseline gap-4 mb-4">
                <h2 className="text-2xl font-bold text-purple-400">v{entry.version}</h2>
                <span className="text-sm text-gray-500">{entry.date}</span>
              </div>
              <ul className="space-y-2">
                {entry.changes.map((change, index) => (
                  <li key={index} className="text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400 mt-1">"</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
