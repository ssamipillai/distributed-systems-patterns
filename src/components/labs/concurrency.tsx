import { useMemo, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Model = "global" | "striped" | "lockfree" | "actor";

export function ConcurrencyLab() {
  const [model, setModel] = useState<Model>("global");
  const [cores, setCores] = useState(8);
  const [holdMs, setHoldMs] = useState(2);

  const { throughput, p99, notes } = useMemo(() => {
    if (model === "global") {
      const serial = 1000 / Math.max(0.2, holdMs);
      return {
        throughput: Math.round(serial),
        p99: Math.round(holdMs * cores * 3),
        notes: "One mutex. Extra cores queue. p99 is wait, not work.",
      };
    }
    if (model === "striped") {
      const stripes = Math.min(cores, 16);
      const per = 1000 / Math.max(0.2, holdMs);
      const efficiency = 0.72;
      return {
        throughput: Math.round(per * stripes * efficiency),
        p99: Math.round(holdMs * 4),
        notes: "Stripes recover parallelism when keys don’t collide. Hot keys still convoy.",
      };
    }
    if (model === "lockfree") {
      const base = 1000 / Math.max(0.15, holdMs * 0.4);
      const scaling = 0.55 + cores * 0.05;
      return {
        throughput: Math.round(base * Math.min(cores, 12) * Math.min(1, scaling / 2)),
        p99: Math.round(holdMs * 1.6),
        notes: "Progress under contention, not magic. Wrong memory order is a heisenbug, not a speedup.",
      };
    }
    const mailbox = Math.max(1, Math.round(cores / 2));
    return {
      throughput: Math.round((1000 / Math.max(0.2, holdMs)) * mailbox * 0.8),
      p99: Math.round(holdMs * 2 + (cores > mailbox ? (cores - mailbox) * 1.4 : 0)),
      notes: "One actor per entity serializes the invariant. One actor for the service is a global lock in costume.",
    };
  }, [model, cores, holdMs]);

  const bars = Array.from({ length: cores }, (_, i) => {
    if (model === "global") return i === 0 ? 1 : 0.08;
    if (model === "actor") return i < Math.max(1, Math.round(cores / 2)) ? 0.85 : 0.15;
    if (model === "striped") return 0.5 + (i % 4 === 0 ? 0.4 : 0);
    return 0.65 + (i % 3) * 0.1;
  });

  return (
    <LabFrame
      kicker="Lab 12 — Local contention"
      title="The network is a cache line"
      insight={`${notes} ~${throughput.toLocaleString()} ops/s, p99 ~${p99}ms at ${cores} cores holding ${holdMs}ms.`}
    >
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Concurrency model"
          value={model}
          onChange={setModel}
          options={[
            { id: "global", label: "Global mutex" },
            { id: "striped", label: "Striped" },
            { id: "lockfree", label: "Lock-free" },
            { id: "actor", label: "Actors" },
          ]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Range label="Cores" value={cores} min={1} max={16} onChange={setCores} />
          <Range label="Critical section" value={holdMs} min={1} max={20} onChange={setHoldMs} suffix="ms" />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4">
          <Stat label="Throughput" value={`${throughput.toLocaleString()}/s`} />
          <Stat label="p99 wait" value={`${p99}ms`} tone={p99 > 20 ? "danger" : "fg"} />
        </div>
        <div className="flex h-32 items-end gap-1 rounded-lg bg-raised px-3 py-3">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-steel"
              style={{ height: `${v * 100}%`, opacity: 0.45 + v * 0.55 }}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-faint uppercase">Per-core useful work · idle bars are convoy</p>
      </div>
    </LabFrame>
  );
}
