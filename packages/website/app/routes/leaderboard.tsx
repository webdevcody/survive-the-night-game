import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function meta() {
  return [
    { title: "Leaderboard - Survive the Night" },
    {
      name: "description",
      content: "View the top survivors and their night records.",
    },
  ];
}

// Placeholder leaderboard data
const LEADERBOARD_DATA = [
  { rank: 1, playerName: "ZombieSlayer99", nightsSurvived: 47, kills: 2834 },
  { rank: 2, playerName: "NightHunter", nightsSurvived: 42, kills: 2567 },
  { rank: 3, playerName: "SurvivalKing", nightsSurvived: 38, kills: 2245 },
  { rank: 4, playerName: "DeadShot", nightsSurvived: 35, kills: 2103 },
  { rank: 5, playerName: "TheLastOne", nightsSurvived: 33, kills: 1998 },
  { rank: 6, playerName: "DawnSeeker", nightsSurvived: 30, kills: 1876 },
  { rank: 7, playerName: "CraftMaster", nightsSurvived: 28, kills: 1754 },
  { rank: 8, playerName: "WallBuilder", nightsSurvived: 25, kills: 1632 },
  { rank: 9, playerName: "LootGoblin", nightsSurvived: 23, kills: 1521 },
  { rank: 10, playerName: "NoobSlayer", nightsSurvived: 20, kills: 1387 },
];

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </Button>
          </Link>
          <h1 className="text-5xl font-bold text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            Leaderboard
          </h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        {/* Leaderboard Table */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 bg-gray-900/80 p-4 font-bold text-gray-300 border-b border-gray-700">
              <div className="text-center">Rank</div>
              <div>Player</div>
              <div className="text-center">Nights Survived</div>
              <div className="text-center">Total Kills</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-700">
              {LEADERBOARD_DATA.map((player) => (
                <div
                  key={player.rank}
                  className={`grid grid-cols-4 gap-4 p-4 hover:bg-gray-700/30 transition-colors ${
                    player.rank <= 3 ? "bg-yellow-900/10" : ""
                  }`}
                >
                  {/* Rank with medal for top 3 */}
                  <div className="text-center font-bold">
                    {player.rank === 1 && <span className="text-2xl">🥇</span>}
                    {player.rank === 2 && <span className="text-2xl">🥈</span>}
                    {player.rank === 3 && <span className="text-2xl">🥉</span>}
                    {player.rank > 3 && (
                      <span className="text-gray-400">#{player.rank}</span>
                    )}
                  </div>

                  {/* Player Name */}
                  <div className="font-semibold text-white">
                    {player.playerName}
                  </div>

                  {/* Nights Survived */}
                  <div className="text-center text-green-400 font-bold">
                    {player.nightsSurvived}
                  </div>

                  {/* Total Kills */}
                  <div className="text-center text-red-400">
                    {player.kills.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-500 mt-6 text-sm">
            Leaderboard updates every 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
