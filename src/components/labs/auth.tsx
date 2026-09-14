import { useState } from "react";
import { LabFrame, Segmented } from "@/components/lab-kit";

type Topo = "cookie" | "bearer" | "bff";

const ATTACKS = [
  {
    id: "xss",
    name: "XSS theft",
    cookie: "Script cannot read httpOnly. It can still drive same-origin requests (session riding), not exfiltrate the cookie.",
    bearer: "localStorage is loot. One injected script posts the refresh token abroad. Account takeover.",
    bff: "SPA holds nothing. XSS is still a same-origin attacker, but there is no token to pocket.",
  },
  {
    id: "csrf",
    name: "CSRF",
    cookie: "SameSite=Lax blocks foreign POSTs. SameSite=None needs a CSRF token. Cross-site is the whole question.",
    bearer: "Authorization header is not sent by foreign forms. CSRF largely evaporates; XSS remains the boss fight.",
    bff: "Cookie to the BFF is first-party if the edge shares the site. Same SameSite rules as cookie, plus a smaller origin.",
  },
  {
    id: "revoke",
    name: "Cross-region revoke",
    cookie: "Session store must be reached. A regional store plus broken stickiness = a ghost cookie in the other region.",
    bearer: "A JWT still verifies after logout until TTL. Denylist or short access + rotating refresh, globally.",
    bff: "Edge session can be killed centrally if the session store is the source of truth — or you just moved the lag to the worker.",
  },
] as const;

export function AuthLab() {
  const [topo, setTopo] = useState<Topo>("cookie");

  const insight =
    topo === "cookie"
      ? "Browsers already have a credential vault. Use it, make it httpOnly, and spend your fear on CSRF and domain boundaries — not on reinventing sessions in Redux."
      : topo === "bearer"
        ? "Bearer tokens are for clients that are not your website. Memory-only access + a non-JS refresh is the least-bad SPA variant. localStorage is not a vault."
        : "The CDN-hosted SPA never saw a token. The worker terminated the cookie and spoke inward with an identity the origin trusts. The edge is now in the auth path — treat it that way.";

  return (
    <LabFrame kicker="Lab 07 — Where the token lives" title="Pick a home for the session. Watch the attacks move." insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Auth topology"
          value={topo}
          onChange={setTopo}
          options={[
            { id: "cookie", label: "httpOnly cookie" },
            { id: "bearer", label: "Bearer JWT" },
            { id: "bff", label: "Edge BFF" },
          ]}
        />
        <ul className="grid gap-3">
          {ATTACKS.map((a) => (
            <li key={a.id} className="rounded-lg bg-raised p-4">
              <p className="font-mono text-[11px] tracking-[0.14em] text-steel uppercase">{a.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg">{a[topo]}</p>
            </li>
          ))}
        </ul>
      </div>
    </LabFrame>
  );
}
