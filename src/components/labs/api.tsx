import { useState } from "react";
import { LabFrame, Segmented } from "@/components/lab-kit";

type Pattern = "sync" | "accepted" | "webhook";
type Fault = "none" | "slow" | "error";

const STEPS: Record<Pattern, string[]> = {
  sync: [
    "Client POST /checkout",
    "API holds the socket, calls payments, inventory, email",
    "Gateway timeout (10s) vs work (varies)",
    "Client receives 200 — or retries a still-running write",
  ],
  accepted: [
    "Client POST /checkout → 202, Location: /jobs/j1",
    "Worker runs payments / inventory off the request thread",
    "Client GET /jobs/j1 (or SSE)",
    "200 on the job, not on the original socket — retries are job-safe",
  ],
  webhook: [
    "Partner POST /checkout → 202",
    "Worker completes, POST partner.com/hooks",
    "If they 500, you retry with backoff + signature",
    "Their downtime is now your queue depth",
  ],
};

export function ApiLab() {
  const [pattern, setPattern] = useState<Pattern>("sync");
  const [fault, setFault] = useState<Fault>("slow");
  const [step, setStep] = useState(0);

  const outcome =
    pattern === "sync" && fault === "slow"
      ? "The gateway returns 504 at 10s. The payment capture is still in flight. The client retries. Two captures."
      : pattern === "sync" && fault === "error"
        ? "A 500 bubbles up. The client retries the whole graph. Idempotency keys are the only adult in the room."
        : pattern === "accepted" && fault === "slow"
          ? "The 202 already returned. Polling sees running → succeeded. The user’s spinner is UX, not a held thread."
          : pattern === "accepted" && fault === "error"
            ? "Job resource records failed. Client does not retry POST; it inspects /jobs/j1. The write happened once."
            : pattern === "webhook" && fault === "slow"
              ? "You retry their endpoint for minutes. Ordering is not guaranteed unless you sequence per partner."
              : pattern === "webhook" && fault === "error"
                ? "Signature + event id de-dupe saves you from their replay. Without both, last week’s event is this week’s charge."
                : "Happy path. Everyone pretends this is the architecture.";

  return (
    <LabFrame kicker="Lab 05 — Time as a contract" title="The status code is a promise about waiting" insight={outcome}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="API pattern"
          value={pattern}
          onChange={(v) => {
            setPattern(v);
            setStep(0);
          }}
          options={[
            { id: "sync", label: "Sync 200" },
            { id: "accepted", label: "202 + Location" },
            { id: "webhook", label: "Webhook" },
          ]}
        />
        <Segmented
          ariaLabel="Fault"
          value={fault}
          onChange={setFault}
          options={[
            { id: "none", label: "Happy" },
            { id: "slow", label: "Slow dep" },
            { id: "error", label: "500" },
          ]}
        />
        <ol className="grid gap-2">
          {STEPS[pattern].map((line, i) => (
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
            onClick={() => setStep((s) => Math.min(s + 1, STEPS[pattern].length - 1))}
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
    </LabFrame>
  );
}
