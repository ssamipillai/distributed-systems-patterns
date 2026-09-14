import { useEffect, useMemo, useRef, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Retry = "none" | "naive" | "jitter";
type Breaker = "closed" | "open" | "half";

export function ResiliencyLab() {
  const [failPct, setFailPct] = useState(35);
  const [retry, setRetry] = useState<Retry>("naive");
  const [running, setRunning] = useState(true);
  const [breaker, setBreaker] = useState<Breaker>("closed");
  const fails = useRef(0);
  const [stats, setStats] = useState({ in: 0, out: 0, ok: 0, rejected: 0 });
  const hist = useRef<number[]>(Array(24).fill(0));
  const [, bump] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const inbound = 8;
      let outbound = 0;
      let ok = 0;
      let rejected = 0;
      let localFails = fails.current;

      for (let i = 0; i < inbound; i++) {
        if (breaker === "open") {
          rejected += 1;
          continue;
        }
        const attempts = retry === "none" ? 1 : 3;
        let success = false;
        for (let a = 0; a < attempts; a++) {
          outbound += 1;
          const failed = Math.random() * 100 < failPct;
          if (!failed) {
            success = true;
            localFails = 0;
            break;
          }
          localFails += 1;
          if (retry === "naive") {
            // synchronized — every caller retries immediately, amplifying
          }
        }
        if (success) ok += 1;
      }

      let nextBreaker = breaker;
      if (localFails >= 12) nextBreaker = "open";
      else if (breaker === "open") nextBreaker = "half";
      else if (breaker === "half" && ok > 0) nextBreaker = "closed";
      else nextBreaker = "closed";

      fails.current = nextBreaker === "open" ? localFails : Math.max(0, localFails - 2);
      if (nextBreaker !== breaker) setBreaker(nextBreaker);

      const amp = outbound / inbound;
      hist.current = [...hist.current.slice(1), amp];
      setStats((s) => ({
        in: s.in + inbound,
        out: s.out + outbound,
        ok: s.ok + ok,
        rejected: s.rejected + rejected,
      }));
      bump((x) => x + 1);
    }, 450);
    return () => window.clearInterval(id);
  }, [running, failPct, retry, breaker]);

  const amp = stats.in === 0 ? 1 : stats.out / stats.in;
  const maxH = Math.max(3, ...hist.current);

  const insight = useMemo(() => {
    if (breaker === "open") {
      return "Breaker open: we fail fast and the dependency is allowed to recover. Rejected calls are cheaper than retries into a corpse.";
    }
    if (retry === "naive" && failPct > 20) {
      return `Naive retries amplified traffic ${amp.toFixed(1)}×. The dependency’s outage is now also your origin’s. This is a retry storm.`;
    }
    if (retry === "jitter") {
      return `Full jitter still retries, but the extra load is spread. Amplification ${amp.toFixed(1)}× — bounded by the breaker, not by hope.`;
    }
    return `No retries: amplification stays ~1×. Users feel every blip. That is honesty, not always the right honesty.`;
  }, [amp, breaker, failPct, retry]);

  return (
    <LabFrame kicker="Lab 06 — Retry storms" title="Courtesy is load" insight={insight}>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Retry policy"
            value={retry}
            onChange={(v) => {
              setRetry(v);
              fails.current = 0;
              setBreaker("closed");
              setStats({ in: 0, out: 0, ok: 0, rejected: 0 });
            }}
            options={[
              { id: "none", label: "No retry" },
              { id: "naive", label: "Retry ×3" },
              { id: "jitter", label: "Jittered" },
            ]}
          />
          <button
            type="button"
            className="h-11 rounded-md bg-raised px-3 text-sm font-medium"
            onClick={() => setRunning((r) => !r)}
          >
            {running ? "Pause" : "Run"}
          </button>
        </div>
        <Range label="Dependency failure %" value={failPct} min={0} max={90} step={5} onChange={setFailPct} suffix="%" />
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4 sm:grid-cols-4">
          <Stat label="Breaker" value={breaker} tone={breaker === "open" ? "danger" : breaker === "half" ? "warn" : "ok"} />
          <Stat label="Amplification" value={`${amp.toFixed(1)}×`} tone={amp > 2 ? "danger" : "fg"} />
          <Stat label="OK" value={stats.ok} tone="ok" />
          <Stat label="Shed" value={stats.rejected} tone="warn" />
        </div>
        <div className="flex h-28 items-end gap-1 rounded-lg bg-raised px-3 py-3">
          {hist.current.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-steel"
              style={{ height: `${(v / maxH) * 100}%`, opacity: 0.35 + (i / 24) * 0.65 }}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-faint uppercase">Outbound / inbound per tick</p>
      </div>
    </LabFrame>
  );
}
