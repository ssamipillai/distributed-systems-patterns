import { useMemo, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Mode = "pull" | "gitops" | "push";

const FLEET = 24;

export function ConfigLab() {
  const [mode, setMode] = useState<Mode>("pull");
  const [interval, setInterval] = useState(15);
  const [t, setT] = useState(20);

  const series = useMemo(() => {
    return Array.from({ length: FLEET }, (_, i) => {
      const jitter = (i * 7) % Math.max(1, interval);
      if (mode === "pull") {
        const delay = interval + jitter;
        return Math.min(100, Math.max(0, ((t - delay) / 1) * 100));
      }
      if (mode === "gitops") {
        const reconcile = 45 + (i % 12);
        return t >= reconcile ? 100 : t >= reconcile - 10 ? 40 : 0;
      }
      const stream = 3 + (i % 4);
      return t >= stream ? 100 : 0;
    }).map((v) => Math.max(0, Math.min(100, v)));
  }, [mode, interval, t]);

  const coverage = Math.round(series.filter((v) => v >= 100).length / FLEET * 100);
  const load =
    mode === "pull"
      ? Math.round(FLEET / Math.max(1, interval / 5))
      : mode === "push"
        ? t < 6
          ? FLEET
          : 2
        : 1;

  const insight =
    coverage > 0 && coverage < 100 && mode !== "push"
      ? `${coverage}% of the fleet has the new bit. If this flag is a migration, you are dual-writing without consent. Gate on coverage, not on a sleep(30).`
      : mode === "push"
        ? `Streaming flipped the fleet in seconds. Also: if the stream dies at t=0 forever, this graph freezes at last-known-good. Age of flags is the SLO.`
        : mode === "gitops"
          ? `GitOps is an audit log with a reconcile loop. Fine for protocol versions. Fatal for a kill switch you needed at t=3.`
          : `Pull with interval ${interval}s. Simple, and your kill switch’s p100 is ‘poll + jitter.’ Disk cache so boot does not require the mothership.`;

  return (
    <LabFrame kicker="Lab 11 — Time to consistent" title="A boolean that takes eight minutes is not a kill switch" insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Propagation"
          value={mode}
          onChange={setMode}
          options={[
            { id: "pull", label: "Pull" },
            { id: "gitops", label: "GitOps" },
            { id: "push", label: "Push / stream" },
          ]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {mode === "pull" ? (
            <Range label="Poll interval" value={interval} min={5} max={60} step={5} onChange={setInterval} suffix="s" />
          ) : (
            <div />
          )}
          <Range label="Seconds since flip" value={t} min={0} max={90} onChange={setT} suffix="s" />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4">
          <Stat label="Coverage" value={`${coverage}%`} tone={coverage === 100 ? "ok" : coverage === 0 ? "muted" : "warn"} />
          <Stat label="Config QPS" value={load} tone={load > 10 ? "warn" : "fg"} />
        </div>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
          {series.map((v, i) => (
            <div
              key={i}
              className="h-8 rounded-xs"
              style={{
                background:
                  v >= 100 ? "var(--color-ok)" : v > 0 ? "var(--color-warn)" : "var(--color-raised)",
                boxShadow: v === 0 ? "var(--shadow-border)" : undefined,
              }}
              title={`pod ${i} ${v}%`}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-faint uppercase">Each square is an instance · green has the new flag</p>
      </div>
    </LabFrame>
  );
}
