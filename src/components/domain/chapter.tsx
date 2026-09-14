import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Domain } from "@/lib/content/types";
import { adjacent, DOMAINS, getDomain } from "@/lib/content/domains";
import { LABS } from "@/components/labs/registry";
import { ChapterList } from "@/components/layout/app-shell";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function Chapter({ domain }: { domain: Domain }) {
  const markVisited = useProgress((s) => s.markVisited);
  const toggleMastered = useProgress((s) => s.toggleMastered);
  const mastered = useProgress((s) => s.mastered);
  const visited = useProgress((s) => s.visited);
  const pathname = `/d/${domain.slug}`;
  const Lab = LABS[domain.slug];
  const { prev, next } = adjacent(domain.slug);
  const related = domain.related.map((s) => getDomain(s)).filter(Boolean);
  const done = mastered.includes(domain.slug);

  useEffect(() => {
    markVisited(domain.slug);
  }, [domain.slug, markVisited]);

  const Icon = domain.icon;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
      <aside className="sticky top-24 hidden self-start lg:block">
        <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Chapters</p>
        <ChapterList pathname={pathname} visited={visited} mastered={mastered} />
      </aside>

      <article className="min-w-0">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-steel uppercase">
          <Icon className="size-3.5" aria-hidden />
          Chapter {String(domain.id).padStart(2, "0")} · {domain.minutes} min
        </p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
          {domain.title}
        </h1>
        <blockquote className="mt-6 max-w-3xl border-l border-steel/40 pl-4 font-display text-lg leading-snug text-muted italic sm:text-xl">
          {domain.thesis}
        </blockquote>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">{domain.stakes}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg/90">
          <span className="font-medium text-steel">The dilemma. </span>
          {domain.dilemma}
        </p>

        <div className="mt-10">{Lab ? <Lab /> : null}</div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-medium tracking-tight">Competing options</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            None of these is a personality. Each is a contract about who waits and who is allowed to be wrong.
          </p>
          <div className="mt-6 grid gap-4">
            {domain.options.map((opt) => (
              <div key={opt.name} className="rounded-xl bg-surface p-5 hairline sm:p-6">
                <h3 className="font-display text-xl font-medium text-fg">{opt.name}</h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Note kicker="Grants" body={opt.promise} />
                  <Note kicker="Costs" body={opt.cost} />
                  <Note kicker="Use when" body={opt.useWhen} />
                  <Note kicker="Avoid when" body={opt.avoidWhen} />
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-medium tracking-tight">Failure modes</h2>
          <div className="mt-6 grid gap-3">
            {domain.failures.map((f) => (
              <details
                key={f.name}
                className="group rounded-xl bg-surface hairline"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left">
                  <span className="font-medium text-fg">{f.name}</span>
                  <span className="font-mono text-[11px] text-faint group-open:text-steel">story</span>
                </summary>
                <div className="grid gap-3 border-t border-line px-5 py-4 text-sm leading-relaxed">
                  <p className="text-fg">{f.story}</p>
                  <p className="text-muted">
                    <span className="font-medium text-warn">Signal. </span>
                    {f.signal}
                  </p>
                  <p className="text-muted">
                    <span className="font-medium text-ok">Mitigate. </span>
                    {f.mitigate}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-medium tracking-tight">Decision rules</h2>
          <ol className="mt-6 grid gap-4">
            {domain.decisions.map((rule, i) => (
              <li key={rule.if} className="rounded-xl bg-surface p-5 hairline">
                <p className="font-mono text-[11px] tracking-[0.16em] text-steel uppercase">
                  Rule {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="text-muted">If </span>
                  <span className="text-fg">{rule.if}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  <span className="text-muted">Then </span>
                  <span className="text-fg">{rule.then}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{rule.why}</p>
              </li>
            ))}
          </ol>
        </section>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-medium tracking-tight">Adjacent chapters</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {related.map((d) =>
                d ? (
                  <Link
                    key={d.slug}
                    to="/d/$slug"
                    params={{ slug: d.slug }}
                    className="rounded-lg bg-surface p-4 hairline hairline-hover transition-[box-shadow] duration-150"
                  >
                    <p className="font-mono text-[11px] text-faint">
                      {String(d.id).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-medium text-fg">{d.short}</p>
                  </Link>
                ) : null,
              )}
            </div>
          </section>
        ) : null}

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => toggleMastered(domain.slug)}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
              done ? "bg-ok/15 text-ok" : "bg-fg text-bg",
            )}
          >
            <Check className="size-4" aria-hidden />
            {done ? "Understood" : "Mark as understood"}
          </button>
          <p className="font-mono text-xs text-faint">
            {mastered.length} of {DOMAINS.length} marked
          </p>
        </div>

        <nav className="mt-10 flex items-stretch justify-between gap-3 border-t border-line pt-8">
          {prev ? (
            <Link
              to="/d/$slug"
              params={{ slug: prev.slug }}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm text-muted hover:text-fg"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className="truncate">{prev.short}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to="/d/$slug"
              params={{ slug: next.slug }}
              className="flex min-h-12 min-w-0 flex-1 items-center justify-end gap-2 rounded-md px-2 text-sm text-muted hover:text-fg"
            >
              <span className="truncate">{next.short}</span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}

function Note({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">{kicker}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-muted">{body}</dd>
    </div>
  );
}
