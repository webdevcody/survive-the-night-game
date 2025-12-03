import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { getLeaderboard } from "~/fn/leaderboard";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, User } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
  loader: async () => {
    const stats = await getLeaderboard();
    return { stats };
  },
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

type LeaderboardEntry = {
  rank: number;
  playerName: string;
  playerImage: string | null;
  zombieKills: number;
  wavesCompleted: number;
  maxWave: number;
};

type SortKey = keyof LeaderboardEntry;
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <Button variant="ghost" onClick={() => onSort(sortKey)} className="h-8 px-2 hover:bg-muted/50">
      {label}
      {isActive && currentDir === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : isActive && currentDir === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

function Leaderboard() {
  const { stats } = Route.useLoaderData();
  const [sortKey, setSortKey] = useState<SortKey>("maxWave");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [stats, sortKey, sortDir]);

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
        </div>

        {/* Leaderboard Table */}
        <div className="max-w-5xl mx-auto">
          <Card className="bg-background/95 backdrop-blur-sm border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Top Survivors</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">No survivors yet!</p>
                  <p className="text-sm mt-2">
                    Be the first to survive the night and claim your spot.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">
                        <SortableHeader
                          label="Rank"
                          sortKey="rank"
                          currentSort={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Player"
                          sortKey="playerName"
                          currentSort={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="text-center">
                        <SortableHeader
                          label="Best Wave"
                          sortKey="maxWave"
                          currentSort={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="text-center">
                        <SortableHeader
                          label="Waves Survived"
                          sortKey="wavesCompleted"
                          currentSort={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="text-center">
                        <SortableHeader
                          label="Total Kills"
                          sortKey="zombieKills"
                          currentSort={sortKey}
                          currentDir={sortDir}
                          onSort={handleSort}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStats.map((player) => (
                      <TableRow
                        key={player.rank}
                        className={player.rank <= 3 ? "bg-yellow-500/10" : "bg-background"}
                      >
                        <TableCell className="text-center font-bold">
                          {player.rank === 1 && <span className="text-2xl">🥇</span>}
                          {player.rank === 2 && <span className="text-2xl">🥈</span>}
                          {player.rank === 3 && <span className="text-2xl">🥉</span>}
                          {player.rank > 3 && (
                            <span className="text-muted-foreground">#{player.rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.playerImage || undefined} />
                              <AvatarFallback className="bg-primary/10">
                                {player.playerName?.charAt(0)?.toUpperCase() || (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{player.playerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-purple-500">
                          {player.maxWave}
                        </TableCell>
                        <TableCell className="text-center font-bold text-green-500">
                          {player.wavesCompleted}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-red-500">
                          {player.zombieKills.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-muted-foreground mt-6 text-sm">
            Click column headers to sort • Stats update in real-time
          </p>
        </div>
      </div>
    </div>
  );
}
