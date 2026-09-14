import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "steel" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones = {
    muted: "text-muted bg-raised",
    steel: "text-bg bg-steel",
    ok: "text-ok bg-ok/10",
    warn: "text-warn bg-warn/10",
    danger: "text-danger bg-danger/10",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
