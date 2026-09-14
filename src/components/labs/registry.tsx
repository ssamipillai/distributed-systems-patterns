import type { ComponentType } from "react";
import { ConsistencyLab } from "./consistency";
import { CachingLab } from "./caching";
import { StorageLab } from "./storage";
import { StreamingLab } from "./streaming";
import { ApiLab } from "./api";
import { ResiliencyLab } from "./resiliency";
import { AuthLab } from "./auth";
import { SearchLab } from "./search";
import { CellsLab } from "./cells";
import { GraphLab } from "./graph";
import { ConfigLab } from "./config";
import { ConcurrencyLab } from "./concurrency";

export const LABS: Record<string, ComponentType> = {
  consistency: ConsistencyLab,
  caching: CachingLab,
  storage: StorageLab,
  streaming: StreamingLab,
  microservices: ApiLab,
  resiliency: ResiliencyLab,
  "edge-auth": AuthLab,
  search: SearchLab,
  cells: CellsLab,
  permissions: GraphLab,
  config: ConfigLab,
  concurrency: ConcurrencyLab,
};
