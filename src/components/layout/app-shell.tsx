import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { DOMAINS } from "@/lib/content/domains";
import { useProgress } from "@/lib/progress";
import { SearchPalette } from "@/components/search-palette";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrate = useProgress((s) => s.hydrate);
  const visited = useProgress((s) => s.visited);
  const mastered = useProgress((s) => s.mastered);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const progress = mastered.length;

  return (
    <div className="paper-grid min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden"
            aria-label="Open chapters"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl tracking-tight text-fg">Quorum</span>
            <span className="hidden font-mono text-micro tracking-kicker text-muted uppercase sm:inline">
              Field manual
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted hover:text-fg"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded-xs bg-raised px-1.5 py-0.5 font-mono text-micro text-faint md:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/"
              className="hidden h-11 items-center rounded-md px-3 text-sm text-muted hover:text-fg sm:inline-flex"
            >
              Atlas
            </Link>
            <span className="font-mono text-xs tabular-nums text-muted">
              {progress}/{DOMAINS.length}
            </span>
          </div>
        </div>
      </header>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="Close chapters"
            onClick={() => setNavOpen(false)}
          />
          <nav className="relative h-full w-80 max-w-full overflow-y-auto bg-surface p-4 hairline">
            <p className="mb-3 font-mono text-2xs tracking-kicker text-muted uppercase">Chapters</p>
            <ChapterList pathname={pathname} visited={visited} mastered={mastered} />
          </nav>
        </div>
      ) : null}

      {children}
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function ChapterList({
  pathname,
  visited,
  mastered,
}: {
  pathname: string;
  visited: string[];
  mastered: string[];
}) {
  return (
    <ol className="grid gap-0.5">
      {DOMAINS.map((d) => {
        const href = `/d/${d.slug}`;
        const on = pathname === href;
        const done = mastered.includes(d.slug);
        const seen = visited.includes(d.slug);
        return (
          <li key={d.slug}>
            <Link
              to="/d/$slug"
              params={{ slug: d.slug }}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-2.5 text-sm transition-[background-color,color] duration-150",
                on ? "bg-raised text-fg" : "text-muted hover:bg-raised/70 hover:text-fg",
              )}
            >
              <span className="w-6 font-mono text-2xs text-faint tabular-nums">
                {String(d.id).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{d.short}</span>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  done ? "bg-ok" : seen ? "bg-steel" : "bg-line-strong",
                )}
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
