import { useMemo, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Strat = "swr" | "aside" | "through";

const TICKS = 16;

export function CachingLab() {
  const [strat, setStrat] = useState<Strat>("swr");
  const [ttl, setTtl] = useState(4);
  const [writeAt, setWriteAt] = useState(6);
  const [clients, setClients] = useState(8);

  const timeline = useMemo(() => {
    const cells: { t: number; kind: "hit" | "stale" | "miss" | "stampede" | "origin" }[] = [];
    let lastFill = 0;
    let origin = 0;
    let stampede = 0;
    let staleHits = 0;
    let hits = 0;
    for (let t = 0; t < TICKS; t++) {
      const age = t - lastFill;
      const expired = age >= ttl;
      const justWrote = t === writeAt;
      if (justWrote && strat !== "through") {
        // invalidate
        lastFill = -ttl;
      }
      if (justWrote && strat === "through") {
        lastFill = t;
        origin += 1;
        cells.push({ t, kind: "origin" });
        continue;
      }
      if (!expired) {
        if (strat === "swr" && age >= Math.max(1, ttl - 1) && t > 0) {
          staleHits += 1;
          origin += 1;
          lastFill = t;
          cells.push({ t, kind: "stale" });
        } else {
          hits += 1;
          cells.push({ t, kind: "hit" });
        }
      } else if (strat === "aside") {
        stampede += clients;
        origin += clients;
        lastFill = t;
        cells.push({ t, kind: "stampede" });
      } else {
        origin += 1;
        lastFill = t;
        cells.push({ t, kind: "miss" });
      }
    }
    return { cells, origin, stampede, staleHits, hits };
  }, [strat, ttl, writeAt, clients]);

  const insight =
    strat === "aside" && timeline.stampede > 0
      ? `Cache-aside without single-flight: on expiry, ${clients} clients miss together and you paid origin ${timeline.stampede} times for one key. That is an invalidation storm in miniature.`
      : strat === "swr"
        ? `SWR served ${timeline.staleHits} slightly stale responses while a single refresh ran. Origin saw ${timeline.origin} fills, not ${clients}× misses. The stale window is the product contract.`
        : `Write-through updated the cache on the write at t=${writeAt}. Origin traffic is calm (${timeline.origin}) because readers never observe a hole. You paid write latency instead.`;

  return (
    <LabFrame kicker="Lab 02 — Hit, miss, stampede" title="Watch a write punch a hole in the cache" insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Cache strategy"
          value={strat}
          onChange={setStrat}
          options={[
            { id: "swr", label: "SWR" },
            { id: "aside", label: "Cache-aside" },
            { id: "through", label: "Write-through" },
          ]}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Range label="TTL (ticks)" value={ttl} min={2} max={8} onChange={setTtl} />
          <Range label="Write at tick" value={writeAt} min={1} max={TICKS - 2} onChange={setWriteAt} />
          <Range label="Concurrent clients" value={clients} min={1} max={16} onChange={setClients} />
        </div>
        <div className="grid grid-cols-4 gap-3 rounded-lg bg-raised p-4">
          <Stat label="Hits" value={timeline.hits} />
          <Stat label="Stale" value={timeline.staleHits} tone="warn" />
          <Stat label="Origin fills" value={timeline.origin} tone={timeline.origin > 6 ? "danger" : "fg"} />
          <Stat label="Stampede" value={timeline.stampede} tone={timeline.stampede > 0 ? "danger" : "ok"} />
        </div>
        <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-16">
          {timeline.cells.map((c) => (
            <div key={c.t} className="grid gap-1">
              <div
                className={
                  c.kind === "hit"
                    ? "h-10 rounded-sm bg-ok/80"
                    : c.kind === "stale"
                      ? "h-10 rounded-sm bg-warn/80"
                      : c.kind === "stampede"
                        ? "h-10 rounded-sm bg-danger"
                        : c.kind === "origin"
                          ? "h-10 rounded-sm bg-steel"
                          : "h-10 rounded-sm bg-fg/40"
                }
                title={`t=${c.t} ${c.kind}`}
              />
              <span className="text-center font-mono text-[10px] text-faint">{c.t}</span>
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-faint uppercase">
          Green hit · Amber SWR stale · White miss · Steel write-through · Red stampede
        </p>
      </div>
    </LabFrame>
  );
}
