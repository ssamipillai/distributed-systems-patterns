import { useMemo, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Algo = "token" | "fixed" | "sliding";

function fpr(n: number, m: number, k: number) {
  if (m <= 0 || n <= 0) return 0;
  const p = Math.pow(1 - Math.exp(-((k * n) / m)), k);
  return Math.min(0.99, p);
}

export function SearchLab() {
  const [n, setN] = useState(10_000);
  const [bits, setBits] = useState(8);
  const [k, setK] = useState(4);
  const [algo, setAlgo] = useState<Algo>("token");
  const [rps, setRps] = useState(8);
  const [limit] = useState(20);

  const m = n * bits;
  const p = useMemo(() => fpr(n, m, k), [n, m, k]);

  // 60-second window simulation: fire `rps` each second, with a double-burst at t=59 and t=0 boundary
  const windowing = useMemo(() => {
    const seconds = 12;
    const allowed: number[] = [];
    let tokens = limit;
    let windowCount = 0;
    let prevBucket = 0;
    for (let t = 0; t < seconds; t++) {
      const demand = t === 5 || t === 6 ? rps * 3 : rps;
      let ok = 0;
      if (algo === "token") {
        tokens = Math.min(limit, tokens + limit / 10);
        const use = Math.min(demand, Math.floor(tokens));
        tokens -= use;
        ok = use;
      } else if (algo === "fixed") {
        const bucket = t < 6 ? 0 : 1;
        if (bucket !== prevBucket) {
          windowCount = 0;
          prevBucket = bucket;
        }
        const room = Math.max(0, limit - windowCount);
        ok = Math.min(demand, room);
        windowCount += ok;
      } else {
        // sliding: last 5 ticks capacity
        const recent = allowed.slice(-4).reduce((a, b) => a + b, 0);
        const room = Math.max(0, limit - recent);
        ok = Math.min(demand, room);
      }
      allowed.push(ok);
    }
    return { allowed, demandPeak: rps * 3 };
  }, [algo, rps, limit]);

  const insight = `Bloom FPR ≈ ${(p * 100).toFixed(1)}% at ${bits} bits/key. Confirm every maybe-yes. Rate limiter: ${
    algo === "fixed"
      ? "the fixed window will allow a double burst at the bucket edge (ticks 5–6)."
      : algo === "token"
        ? "token bucket absorbs a burst then goes dry — burst is a feature with a debit."
        : "sliding window refuses the edge double-burst because the previous window still counts."
  }`;

  const maxBar = Math.max(limit, rps * 3);

  return (
    <LabFrame kicker="Lab 08 — Views that are allowed to lie" title="Bloom false positives and rate-limit edges" insight={insight}>
      <div className="grid gap-8">
        <div className="grid gap-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Bloom filter</p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Range label="Items n" value={n} min={1000} max={50000} step={1000} onChange={setN} />
            <Range label="Bits per key" value={bits} min={4} max={16} onChange={setBits} />
            <Range label="Hash functions k" value={k} min={2} max={8} onChange={setK} />
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-raised p-4">
            <Stat label="Bits" value={m.toLocaleString()} />
            <Stat label="FPR" value={`${(p * 100).toFixed(1)}%`} tone={p > 0.05 ? "danger" : "ok"} />
            <Stat label="Lie mode" value="maybe ∈" tone="warn" />
          </div>
        </div>
        <div className="grid gap-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Rate limit · budget {limit}/window</p>
          <Segmented
            ariaLabel="Limiter"
            value={algo}
            onChange={setAlgo}
            options={[
              { id: "token", label: "Token bucket" },
              { id: "fixed", label: "Fixed window" },
              { id: "sliding", label: "Sliding window" },
            ]}
          />
          <Range label="Steady RPS" value={rps} min={2} max={20} onChange={setRps} />
          <div className="flex h-28 items-end gap-1 rounded-lg bg-raised px-3 py-3">
            {windowing.allowed.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${(v / maxBar) * 100}%`,
                  background: i === 5 || i === 6 ? "var(--color-warn)" : "var(--color-steel)",
                }}
              />
            ))}
          </div>
          <p className="font-mono text-[11px] text-faint uppercase">Amber ticks are the burst at a window edge</p>
        </div>
      </div>
    </LabFrame>
  );
}
