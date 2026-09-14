import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { DOMAINS, INCIDENTS } from "@/lib/content/domains";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const mastered = useProgress((s) => s.mastered);
  const visited = useProgress((s) => s.visited);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-20">
        <p className="font-mono text-[11px] tracking-[0.22em] text-steel uppercase">
          Twelve dilemmas · interactive field notes
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.08] tracking-tight text-fg sm:text-6xl">
          The decisions that only appear under load.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Tutorials end at the happy path. Production begins when two writers, a stale cache, and a polite retry
          agree to lie at the same time. Quorum is a manual for those arguments.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/d/$slug"
            params={{ slug: "consistency" }}
            aria-label="Start with consistency"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-fg px-5 text-sm font-medium text-bg"
          >
            Start with consistency
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#atlas"
            className="inline-flex h-12 items-center rounded-md px-4 text-sm font-medium text-muted hover:text-fg"
          >
            Skip to the atlas
          </a>
        </div>
      </section>

      <section id="atlas" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-medium tracking-tight">The atlas</h2>
          <p className="font-mono text-xs text-faint">{DOMAINS.length} chapters</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            const done = mastered.includes(d.slug);
            const seen = visited.includes(d.slug);
            return (
              <li key={d.slug}>
                <Link
                  to="/d/$slug"
                  params={{ slug: d.slug }}
                  className="group flex h-full min-h-44 flex-col rounded-xl bg-surface p-5 hairline hairline-hover transition-[box-shadow,transform] duration-150 ease-out hover:-translate-y-px"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] tabular-nums text-faint">
                      {String(d.id).padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-2 text-muted">
                      <Icon className="size-4" aria-hidden />
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          done ? "bg-ok" : seen ? "bg-steel" : "bg-line-strong",
                        )}
                      />
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-medium leading-snug tracking-tight text-fg">
                    {d.short}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{d.dilemma}</p>
                  <p className="mt-4 font-mono text-[11px] tracking-wide text-faint uppercase">
                    {d.minutes} min · lab included
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-medium tracking-tight">Incident reports</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Architecture is easier to remember as a page from the on-call log. Each report opens the chapters that
          would have changed the ending.
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {INCIDENTS.map((inc) => (
            <article key={inc.id} className="rounded-xl bg-surface p-5 hairline sm:p-6">
              <p className="font-mono text-[11px] tracking-[0.16em] text-steel uppercase">{inc.kicker}</p>
              <h3 className="mt-2 font-display text-xl font-medium text-fg">{inc.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{inc.body}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {inc.domains.map((slug) => {
                  const d = DOMAINS.find((x) => x.slug === slug);
                  return d ? (
                    <li key={slug}>
                      <Link
                        to="/d/$slug"
                        params={{ slug }}
                        className="inline-flex h-9 items-center rounded-sm bg-raised px-2.5 text-xs font-medium text-fg"
                      >
                        {d.short}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <div className="rounded-xl bg-surface px-5 py-8 hairline sm:px-8">
          <h2 className="font-display text-2xl font-medium tracking-tight">How to read this</h2>
          <ol className="mt-5 grid gap-4 text-sm leading-relaxed text-muted sm:grid-cols-3">
            <li>
              <span className="font-mono text-[11px] text-steel">01</span>
              <p className="mt-1 text-fg">Run the lab until the insight line changes its mind. The widgets are the argument.</p>
            </li>
            <li>
              <span className="font-mono text-[11px] text-steel">02</span>
              <p className="mt-1 text-fg">Options are contracts, not teams. Read the cost as carefully as the promise.</p>
            </li>
            <li>
              <span className="font-mono text-[11px] text-steel">03</span>
              <p className="mt-1 text-fg">Mark a chapter understood when you can name the failure mode you are buying.</p>
            </li>
          </ol>
        </div>
        <p className="mt-8 text-center text-xs text-faint">
          Field notes are opinions under constraints, not laws. Measure your system; then pick a lie you can afford.
        </p>
      </section>
    </main>
  );
}
