import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { searchContent } from "@/lib/content/domains";
import { cn } from "@/lib/utils";

export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchContent(q), [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "/" && !open) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        onOpenChange(true);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-bg/70"
        onClick={() => onOpenChange(false)}
      />
      <Command
        label="Search the field manual"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-surface hairline"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-muted" aria-hidden />
          <Command.Input
            ref={inputRef}
            value={q}
            onValueChange={setQ}
            placeholder="Search dilemmas, failures, incidents"
            className="h-14 w-full bg-transparent text-base text-fg outline-none placeholder:text-faint"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-sm text-muted">Type at least two characters. Try fencing, saga, bloom, cell.</p>
          ) : hits.length === 0 ? (
            <Command.Empty className="px-3 py-6 text-sm text-muted">No matches in the manual.</Command.Empty>
          ) : (
            hits.map((hit) => (
              <Command.Item
                key={`${hit.kind}-${hit.slug}-${hit.title}`}
                value={`${hit.title} ${hit.blurb}`}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: "/d/$slug", params: { slug: hit.slug } });
                }}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2.5 data-[selected=true]:bg-raised",
                )}
              >
                <p className="font-mono text-[10px] tracking-[0.16em] text-steel uppercase">{hit.kind}</p>
                <p className="mt-1 text-sm text-fg">{hit.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{hit.blurb}</p>
              </Command.Item>
            ))
          )}
        </Command.List>
      </Command>
    </div>
  );
}
