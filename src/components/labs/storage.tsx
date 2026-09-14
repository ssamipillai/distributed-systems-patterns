import { useMemo, useState } from "react";
import { LabFrame, Segmented, Stat } from "@/components/lab-kit";

const TENANTS = [
  120, 18, 16, 14, 12, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1,
];

type Key = "tenant" | "hash" | "compound";

function assign(key: Key, shards: number): number[] {
  const load = Array(shards).fill(0) as number[];
  TENANTS.forEach((size, i) => {
    if (key === "tenant") {
      load[i % shards] += size;
    } else if (key === "hash") {
      const h = (i * 17 + size * 3) % shards;
      load[h] += size;
    } else {
      const parts = 4;
      const base = (i * 13) % shards;
      for (let p = 0; p < parts; p++) {
        load[(base + p) % shards] += size / parts;
      }
    }
  });
  return load.map((n) => Math.round(n));
}

export function StorageLab() {
  const [key, setKey] = useState<Key>("tenant");
  const shards = 8;
  const load = useMemo(() => assign(key, shards), [key]);
  const max = Math.max(...load);
  const min = Math.min(...load);
  const imbalance = max === 0 ? 0 : max / Math.max(min, 1);

  const insight =
    key === "tenant"
      ? `Sharding on tenant_id put the whale (${TENANTS[0]} units) on a single shard. Imbalance ${imbalance.toFixed(1)}×. Scaling ‘the cluster’ will not cool that disk.`
      : key === "hash"
        ? `Hashing tenant id spreads the long tail, but the whale is still atomic — one shard still holds ${max}. Hashing does not split a celebrity; it only hides which shard they land on.`
        : `A compound key (tenant, entity) splits the whale across shards. Peak ${max} vs min ${min}. Cross-shard queries for that tenant are the tax you agreed to pay.`;

  return (
    <LabFrame kicker="Lab 03 — Hot partitions" title="The whale always finds a disk" insight={insight}>
      <div className="grid gap-5">
        <Segmented
          ariaLabel="Shard key"
          value={key}
          onChange={setKey}
          options={[
            { id: "tenant", label: "tenant_id" },
            { id: "hash", label: "hash(tenant)" },
            { id: "compound", label: "tenant + entity" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-raised p-4 sm:grid-cols-4">
          <Stat label="Shards" value={shards} />
          <Stat label="Peak load" value={max} tone="danger" />
          <Stat label="Min load" value={min} tone="ok" />
          <Stat label="Imbalance" value={`${imbalance.toFixed(1)}×`} tone={imbalance > 3 ? "danger" : "warn"} />
        </div>
        <div className="grid grid-cols-8 gap-2">
          {load.map((n, i) => {
            const pct = max === 0 ? 0 : n / max;
            return (
              <div key={i} className="flex h-36 flex-col justify-end gap-2">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(8, pct * 100)}%`,
                    background:
                      pct > 0.75
                        ? "var(--color-danger)"
                        : pct > 0.45
                          ? "var(--color-warn)"
                          : "var(--color-steel)",
                  }}
                />
                <span className="text-center font-mono text-[10px] text-faint">s{i}</span>
              </div>
            );
          })}
        </div>
      </div>
    </LabFrame>
  );
}
