import { useMemo, useState } from "react";
import { LabFrame, NodeDot, Range, Segmented, Stat } from "@/components/lab-kit";

export function ConsistencyLab() {
  const [n, setN] = useState(5);
  const [r, setR] = useState(3);
  const [w, setW] = useState(3);
  const [dead, setDead] = useState(0);

  const overlap = r + w > n;
  const writeOk = n - dead >= w;
  const readOk = n - dead >= r;
  const available = writeOk && readOk;

  const nodes = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);

  const insight = !overlap
    ? `R+W = ${r + w} which is not greater than N=${n}. A write quorum and a later read quorum can miss each other — you will serve a value that was never the latest write.`
    : !writeOk
      ? `${dead} node${dead === 1 ? "" : "s"} down. Writes need ${w} acknowledgements. This cluster will refuse writes until a node returns — availability was the cost of W.`
      : !readOk
        ? `Reads need ${r} of ${n}, and only ${n - dead} remain. Strong overlap on paper, unavailable in this failure.`
        : `R+W = ${r + w} > N=${n}. Every read quorum intersects every write quorum. You can lose ${Math.min(n - r, n - w)} node${Math.min(n - r, n - w) === 1 ? "" : "s"} and still both read and write.`;

  return (
    <LabFrame kicker="Lab 01 — Quorum arithmetic" title="Overlap is a number, not a feeling" insight={insight}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-5">
          <Range
            label="N replicas"
            value={n}
            min={3}
            max={9}
            onChange={(v) => {
              setN(v);
              setR((x) => Math.min(x, v));
              setW((x) => Math.min(x, v));
              setDead((d) => Math.min(d, v - 1));
            }}
          />
          <Range label="R read quorum" value={r} min={1} max={n} onChange={setR} />
          <Range label="W write quorum" value={w} min={1} max={n} onChange={setW} />
          <Range label="Failed nodes" value={dead} min={0} max={n - 1} onChange={setDead} />
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-raised p-4">
          <Stat label="R + W" value={r + w} tone={overlap ? "ok" : "danger"} />
          <Stat label="N + 1" value={n + 1} tone="muted" />
          <Stat label="Overlap" value={overlap ? "yes" : "no"} tone={overlap ? "ok" : "danger"} />
          <Stat label="Available" value={available ? "yes" : "no"} tone={available ? "ok" : "warn"} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-x-3 gap-y-3 rounded-lg bg-raised/70 px-3 py-5">
        {nodes.map((i) => (
          <NodeDot
            key={i}
            label={`n${i + 1}`}
            state={i < dead ? "dead" : i < w ? "write" : i < r ? "read" : "idle"}
          />
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[11px] tracking-wide text-faint uppercase">
        Filled = write quorum · Steel = extra read copies · Empty = not required · Red = down
      </p>
      <FencingMini />
    </LabFrame>
  );
}

function FencingMini() {
  const [mode, setMode] = useState<"ttl" | "fence">("ttl");
  const [step, setStep] = useState(0);

  const ttl = [
    "Client A holds lock key=stock, TTL 10s.",
    "Client A GC-pauses for 12s. TTL expires.",
    "Client B acquires the same lock. Two holders exist.",
    "Both write qty=0. The row has two last-writers. Split-brain.",
  ];
  const fence = [
    "Client A acquires lock and fencing token T=7.",
    "A pauses. TTL expires. B acquires, token T=8.",
    "A wakes, writes with T=7. Storage rejects: 7 < 8.",
    "Only B’s write lands. The lock service was never the source of truth — the token check was.",
  ];
  const lines = mode === "ttl" ? ttl : fence;

  return (
    <div className="mt-8 grid gap-4 border-t border-line pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Lock fencing</p>
        <Segmented
          ariaLabel="Lock mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setStep(0);
          }}
          options={[
            { id: "ttl", label: "TTL only" },
            { id: "fence", label: "Fencing token" },
          ]}
        />
      </div>
      <ol className="grid gap-2">
        {lines.map((line, i) => (
          <li
            key={line}
            className={`rounded-md px-3 py-2.5 text-sm leading-relaxed ${
              i === step ? "bg-raised text-fg" : i < step ? "text-muted" : "text-faint"
            }`}
          >
            <span className="mr-2 font-mono text-[11px] text-steel">{i + 1}</span>
            {line}
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-11 rounded-md bg-fg px-4 text-sm font-medium text-bg"
          onClick={() => setStep((s) => Math.min(s + 1, lines.length - 1))}
        >
          Step
        </button>
        <button
          type="button"
          className="h-11 rounded-md px-4 text-sm font-medium text-muted hover:text-fg"
          onClick={() => setStep(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
