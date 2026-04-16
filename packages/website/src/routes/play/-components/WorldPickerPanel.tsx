import { Button } from "~/components/ui/button";

export type RegistryWorldRow = {
  id: number;
  displayName: string | null;
  region?: string | null;
  publicWsUrl: string;
};

export type WorldPickerSelection = {
  worldId: number;
  publicWsUrl: string;
};

function pingLatencyDotClass(ping: number): string {
  if (ping < 100) return "bg-green-500";
  if (ping < 200) return "bg-yellow-400";
  if (ping < 300) return "bg-red-500";
  return "bg-red-600";
}

type WorldPickerPanelProps = {
  worlds: RegistryWorldRow[];
  pings: Record<number, number | null>;
  playerCounts: Record<number, number | null>;
  bookmarkNotice?: string | null;
  onContinueWithSelection: (selection: WorldPickerSelection) => void;
};

export function WorldPickerPanel({
  worlds,
  pings,
  playerCounts,
  bookmarkNotice,
  onContinueWithSelection,
}: WorldPickerPanelProps) {
  const sorted = [...worlds].sort((a, b) => {
    const pa = pings[a.id];
    const pb = pings[b.id];
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return a.id - b.id;
  });

  return (
    <>
      <img
        src="/world-picker-bg-pixel.png"
        alt=""
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover [image-rendering:pixelated]"
      />
      <div
        className="fixed inset-0 z-[1] bg-gradient-to-b from-black/75 via-black/60 to-black/85"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 text-white">
        <div className="max-w-lg text-center">
          <h1 className="text-xl font-semibold">Choose a world</h1>
          {bookmarkNotice ? (
            <p className="mt-3 rounded-md border border-amber-600/50 bg-amber-950/40 px-3 py-2 text-amber-100 text-sm">
              {bookmarkNotice}
            </p>
          ) : null}
        </div>

        <ul className="flex w-full max-w-md flex-col gap-3">
          {sorted.map((w) => {
            const label = w.displayName?.trim() || `World ${w.id}`;
            const ping = pings[w.id];
            const pingLabel = ping != null ? `${ping} ms` : "—";
            const players = playerCounts[w.id];
            const playersLabel = players != null ? String(players) : "—";
            const regionLabel = w.region?.trim() ?? "";
            return (
              <li
                key={w.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex flex-1 flex-col gap-1.5 text-left">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="min-w-0 font-medium">{label}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {ping != null ? (
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full shadow-sm ${pingLatencyDotClass(ping)}`}
                            title={`Latency ${ping} ms`}
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="inline-block size-2 shrink-0 rounded-full bg-muted-foreground/30"
                            aria-hidden
                          />
                        )}
                        <span className="truncate">Ping: {pingLabel}</span>
                      </span>
                      {regionLabel ? (
                        <>
                          <span className="text-muted-foreground/45" aria-hidden>
                            ·
                          </span>
                          <span className="shrink-0">{regionLabel}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="text-left text-base font-medium leading-tight text-muted-foreground">
                    <span className="tabular-nums">{playersLabel}</span> Players online
                  </div>
                </div>
                <Button
                  type="button"
                  className="shrink-0"
                  onClick={() =>
                    onContinueWithSelection({ worldId: w.id, publicWsUrl: w.publicWsUrl })
                  }
                >
                  Connect
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
