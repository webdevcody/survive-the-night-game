import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
});

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

function Leaderboard() {
  return (
    <div className="relative min-h-screen text-white" style={{ backgroundColor: "#00080e" }}>
      {/* Fixed background image - stays in place while scrolling */}
      <div
        className="fixed inset-0 w-full h-full"
        style={{
          backgroundImage: "url(/splash2.jpg)",
          backgroundSize: "contain",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />
      <div className="container mx-auto relative z-10 px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
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
          <Card className="bg-background/95 backdrop-blur-sm border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Top Survivors</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-4 bg-muted/50 p-4 font-bold text-foreground border-b border-border">
                  <div className="text-center">Rank</div>
                  <div>Player</div>
                  <div className="text-center">Nights Survived</div>
                  <div className="text-center">Total Kills</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border">
                  {LEADERBOARD_DATA.map((player) => (
                    <div
                      key={player.rank}
                      className={`grid grid-cols-4 gap-4 p-4 hover:bg-muted/30 transition-colors ${
                        player.rank <= 3 ? "bg-yellow-500/10" : "bg-background"
                      }`}
                    >
                      {/* Rank with medal for top 3 */}
                      <div className="text-center font-bold text-foreground">
                        {player.rank === 1 && <span className="text-2xl">🥇</span>}
                        {player.rank === 2 && <span className="text-2xl">🥈</span>}
                        {player.rank === 3 && <span className="text-2xl">🥉</span>}
                        {player.rank > 3 && (
                          <span className="text-muted-foreground">#{player.rank}</span>
                        )}
                      </div>

                      {/* Player Name */}
                      <div className="font-semibold text-foreground flex items-center">
                        {player.playerName}
                      </div>

                      {/* Nights Survived */}
                      <div className="text-center font-bold text-green-500">
                        {player.nightsSurvived}
                      </div>

                      {/* Total Kills */}
                      <div className="text-center font-semibold text-red-500">
                        {player.kills.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-muted-foreground mt-6 text-sm">
            Leaderboard updates every 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
