import { useMemo, useState } from "react";
import { LabFrame, Segmented, Stat } from "@/components/lab-kit";

type Arch = "shared" | "cells" | "router";
type Fail = "none" | "node" | "cell" | "control";

const CELLS = 8;
const NODES = 4;

export function CellsLab() {
  const [arch, setArch] = useState<Arch>("cells");
  const [fail, setFail] = useState<Fail>("cell");

  const { affected, label } = useMemo(() => {
    const total = CELLS * NODES;
    if (fail === "none") return { affected: 0, label: "quiet" };
    if (arch === "shared") {
      if (fail === "node") return { affected: Math.round(100 / (CELLS * NODES)), label: "one node, shared fate still high on data" };
      return { affected: 100, label: "shared store / control plane" };
    }
    if (arch === "router") {
      if (fail === "control") return { affected: 100, label: "smart router fail-closed" };
      if (fail === "cell") return { affected: Math.round(100 / CELLS), label: "one cell" };
      return { affected: Math.round(100 / total), label: "one node" };
    }
    // cells with dumb routing
    if (fail === "control") return { affected: 0, label: "map stale, fail-open" };
    if (fail === "cell") return { affected: Math.round(100 / CELLS), label: "one cell" };
    return { affected: Math.round(100 / total), label: "one node" };
  }, [arch, fail]);

  const insight =
    arch === "shared" && fail !== "node" && fail !== "none"
      ? "Independent app pools sharing a database are a costume. The blast radius is the data plane."
      : arch === "router" && fail === "control"
        ? "A global cell router that must be healthy for anyone to be healthy is a single cell, theatrically subdivided."
        : arch === "cells" && fail === "control"
          ? "Dumb routing with a last-known map fails open. The control plane’s outage is an inconvenience, not a fleet event."
          : `About ${affected}% of users sit in the blast. Cells do not prevent failure; they make the fraction speakable.`;

  return (
    <LabFrame kicker="Lab 09 — Blast radius" title="Click a failure. Count the customers." insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Architecture"
          value={arch}
          onChange={setArch}
          options={[
            { id: "shared", label: "Shared data" },
            { id: "cells", label: "Cells" },
            { id: "router", label: "Smart router" },
          ]}
        />
        <Segmented
          ariaLabel="Failure"
          value={fail}
          onChange={setFail}
          options={[
            { id: "none", label: "None" },
            { id: "node", label: "Node" },
            { id: "cell", label: "Cell" },
            { id: "control", label: "Control plane" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4">
          <Stat label="Users affected" value={`${affected}%`} tone={affected > 50 ? "danger" : affected > 0 ? "warn" : "ok"} />
          <Stat label="Scope" value={label} />
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({ length: CELLS }, (_, c) => {
            const cellHit =
              fail === "cell" && c === 0
                ? true
                : fail === "control" && (arch === "shared" || arch === "router")
                  ? true
                  : fail !== "none" && arch === "shared" && fail !== "node";
            return (
              <div key={c} className="grid grid-cols-2 gap-1 rounded-md bg-raised p-2">
                {Array.from({ length: NODES }, (_, n) => {
                  const nodeHit = cellHit || (fail === "node" && c === 0 && n === 0);
                  return (
                    <div
                      key={n}
                      className="h-6 rounded-xs"
                      style={{
                        background: nodeHit ? "var(--color-danger)" : "var(--color-ok)",
                        opacity: nodeHit ? 0.85 : 0.55,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="font-mono text-[11px] text-faint uppercase">Each tile is a cell · four nodes inside</p>
      </div>
    </LabFrame>
  );
}
