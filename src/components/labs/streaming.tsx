import { useState, type ReactNode } from "react";
import { LabFrame, Segmented, Stat } from "@/components/lab-kit";

type Sem = "at-most" | "at-least" | "effectively";

type Row = { id: number; status: "queued" | "working" | "acked" | "lost" | "dup" };

export function StreamingLab() {
  const [sem, setSem] = useState<Sem>("at-least");
  const [rows, setRows] = useState<Row[]>(() => seed());
  const [seq, setSeq] = useState(4);
  const [seen] = useState(() => new Set<number>());

  function seed(): Row[] {
    return [0, 1, 2].map((id) => ({ id, status: "queued" as const }));
  }

  function produce() {
    setRows((rs) => [...rs, { id: seq, status: "queued" }]);
    setSeq((s) => s + 1);
  }

  function work() {
    setRows((rs) => {
      const next = rs.map((r) => ({ ...r }));
      const i = next.findIndex((r) => r.status === "queued");
      if (i >= 0) next[i].status = "working";
      return next;
    });
  }

  function crash() {
    setRows((rs) =>
      rs.map((r) => {
        if (r.status !== "working") return r;
        if (sem === "at-most") return { ...r, status: "lost" };
        return { ...r, status: "queued" };
      }),
    );
  }

  function ack() {
    setRows((rs) =>
      rs.map((r) => {
        if (r.status !== "working") return r;
        if (sem === "effectively") {
          if (seen.has(r.id)) return { ...r, status: "dup" };
          seen.add(r.id);
          return { ...r, status: "acked" };
        }
        if (sem === "at-least" && Math.random() < 0.35 && !seen.has(r.id)) {
          seen.add(r.id);
          return { ...r, status: "dup" };
        }
        seen.add(r.id);
        return { ...r, status: "acked" };
      }),
    );
  }

  const lost = rows.filter((r) => r.status === "lost").length;
  const dups = rows.filter((r) => r.status === "dup").length;
  const acked = rows.filter((r) => r.status === "acked").length;

  const insight =
    sem === "at-most"
      ? `Crash during work drops the message (${lost} lost). You will under-charge, under-notify, under-index. Rarely the side effect you wanted.`
      : sem === "at-least"
        ? `Crash re-queues. Ack after a half-done effect produces duplicates (${dups}). This is the default universe. The sink has to be the exactly-once.`
        : `The handler records idempotency keys. A redelivery becomes a no-op (${dups} detected). ‘Exactly-once’ was a property of the effect, not of the broker.`;

  return (
    <LabFrame kicker="Lab 04 — Delivery semantics" title="Crash the worker. Count the lies." insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Delivery semantic"
          value={sem}
          onChange={(v) => {
            setSem(v);
            seen.clear();
            setRows(seed());
            setSeq(4);
          }}
          options={[
            { id: "at-most", label: "At most once" },
            { id: "at-least", label: "At least once" },
            { id: "effectively", label: "Idempotent sink" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Action onClick={produce}>Produce</Action>
          <Action onClick={work}>Start work</Action>
          <Action onClick={crash}>Crash</Action>
          <Action onClick={ack}>Ack / commit</Action>
          <Action
            onClick={() => {
              seen.clear();
              setRows(seed());
              setSeq(4);
            }}
          >
            Reset
          </Action>
        </div>
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-raised p-4">
          <Stat label="Committed" value={acked} tone="ok" />
          <Stat label="Duplicates" value={dups} tone={dups ? "warn" : "muted"} />
          <Stat label="Lost" value={lost} tone={lost ? "danger" : "muted"} />
        </div>
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li
              key={`${r.id}-${r.status}`}
              className="flex items-center justify-between rounded-md bg-raised px-3 py-2.5"
            >
              <span className="font-mono text-sm text-fg">msg-{r.id}</span>
              <span
                className={
                  r.status === "acked"
                    ? "font-mono text-xs text-ok"
                    : r.status === "lost"
                      ? "font-mono text-xs text-danger"
                      : r.status === "dup"
                        ? "font-mono text-xs text-warn"
                        : r.status === "working"
                          ? "font-mono text-xs text-steel"
                          : "font-mono text-xs text-muted"
                }
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </LabFrame>
  );
}

function Action({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-md bg-raised px-3 text-sm font-medium text-fg hover:bg-surface"
    >
      {children}
    </button>
  );
}
