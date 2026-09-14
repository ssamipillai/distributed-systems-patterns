import { useMemo, useState } from "react";
import { LabFrame, Range, Segmented, Stat } from "@/components/lab-kit";

type Strat = "rpc" | "cte" | "async";

export function GraphLab() {
  const [depth, setDepth] = useState(4);
  const [fanout, setFanout] = useState(6);
  const [strat, setStrat] = useState<Strat>("rpc");

  const nodes = useMemo(() => {
    let n = 1;
    let layer = 1;
    for (let d = 0; d < depth; d++) {
      layer *= fanout;
      n += layer;
    }
    return n;
  }, [depth, fanout]);

  const result = useMemo(() => {
    if (strat === "rpc") {
      const rpcs = nodes - 1;
      const latency = depth * 8 + Math.log2(Math.max(2, fanout)) * 4;
      return { queries: rpcs, latencyMs: Math.round(latency * 10) / 10, fail: "partial walk" };
    }
    if (strat === "cte") {
      return {
        queries: 1,
        latencyMs: Math.round((nodes / 80) * 10) / 10 + depth * 2,
        fail: "statement timeout as deny",
      };
    }
    return {
      queries: 1,
      latencyMs: 2.2,
      fail: "revoke lag",
    };
  }, [nodes, strat, depth, fanout]);

  const insight =
    strat === "rpc"
      ? `${result.queries.toLocaleString()} recursive RPCs for one check. Depth ${depth} is a fan-out attack on p99. A single timeout mid-walk is a random 403.`
      : strat === "cte"
        ? `One query expands ~${nodes.toLocaleString()} nodes. Fine until a tenant nests past your mental model. Timeouts that become ‘access denied’ are a product bug.`
        : `The request path reads a materialized userset (~${result.latencyMs}ms). The graph is walked by workers. Your SLO moves to revoke lag — a security queue, not a latency queue.`;

  return (
    <LabFrame kicker="Lab 10 — Reachability" title="One permission check, three shapes of explosion" insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Traversal"
          value={strat}
          onChange={setStrat}
          options={[
            { id: "rpc", label: "Recursive RPC" },
            { id: "cte", label: "DB CTE" },
            { id: "async", label: "Materialized" },
          ]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Range label="Depth" value={depth} min={1} max={8} onChange={setDepth} />
          <Range label="Fan-out / level" value={fanout} min={2} max={10} onChange={setFanout} />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4 sm:grid-cols-4">
          <Stat label="Graph nodes" value={nodes.toLocaleString()} />
          <Stat label="Request queries" value={result.queries.toLocaleString()} tone={result.queries > 50 ? "danger" : "fg"} />
          <Stat label="Check latency" value={`${result.latencyMs}ms`} />
          <Stat label="Failure mode" value={result.fail} tone="warn" />
        </div>
        <GraphSketch depth={Math.min(depth, 4)} fanout={Math.min(fanout, 5)} />
      </div>
    </LabFrame>
  );
}

function GraphSketch({ depth, fanout }: { depth: number; fanout: number }) {
  const layers = Array.from({ length: depth + 1 }, (_, d) =>
    Array.from({ length: Math.min(12, d === 0 ? 1 : fanout * Math.min(d, 3)) }, (_, i) => `${d}-${i}`),
  );
  return (
    <div className="grid gap-3 rounded-lg bg-raised px-3 py-4">
      {layers.map((layer, d) => (
        <div key={d} className="flex flex-wrap justify-center gap-1.5">
          {layer.map((id) => (
            <span key={id} className="size-2.5 rounded-full bg-steel/80" />
          ))}
        </div>
      ))}
    </div>
  );
}
