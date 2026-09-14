import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LabFrame({
  kicker,
  title,
  children,
  insight,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  insight: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-surface hairline">
      <header className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:px-6">
        <p className="font-mono text-2xs font-medium tracking-kicker text-muted uppercase">
          {kicker}
        </p>
        <h2 className="font-display text-xl font-medium tracking-tight text-fg sm:text-2xl">
          {title}
        </h2>
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      <footer className="border-t border-line bg-raised/60 px-5 py-4 sm:px-6">
        <p className="text-sm leading-relaxed text-muted">
          <span className="font-medium text-steel">Insight. </span>
          {insight}
        </p>
      </footer>
    </section>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-mono text-sm tabular-nums text-fg">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1 rounded-md bg-raised p-1"
    >
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-10 flex-1 rounded-sm px-3 text-sm font-medium transition-[background-color,color] duration-150 ease-out",
              on ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "fg",
}: {
  label: string;
  value: string | number;
  tone?: "fg" | "ok" | "warn" | "danger" | "muted";
}) {
  const tones = {
    fg: "text-fg",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
    muted: "text-muted",
  } as const;
  return (
    <div className="grid gap-1">
      <p className="font-mono text-2xs tracking-kicker text-muted uppercase">{label}</p>
      <p className={cn("font-mono text-lg tabular-nums", tones[tone])}>{value}</p>
    </div>
  );
}

export function NodeDot({
  state = "idle",
  label,
}: {
  state?: "idle" | "read" | "write" | "dead" | "hot" | "ok" | "warn";
  label?: string;
}) {
  const fill = {
    idle: "bg-raised hairline",
    read: "bg-steel/80",
    write: "bg-fg",
    dead: "bg-danger/70",
    hot: "bg-danger",
    ok: "bg-ok",
    warn: "bg-warn",
  } as const;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={cn("size-4 rounded-full", fill[state])} />
      {label ? <span className="font-mono text-micro text-faint">{label}</span> : null}
    </div>
  );
}
