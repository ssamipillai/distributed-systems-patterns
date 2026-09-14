import type { LucideIcon } from "lucide-react";

export type DomainOption = {
  name: string;
  promise: string;
  cost: string;
  useWhen: string;
  avoidWhen: string;
};

export type FailureMode = {
  name: string;
  story: string;
  signal: string;
  mitigate: string;
};

export type DecisionRule = {
  if: string;
  then: string;
  why: string;
};

export type Domain = {
  id: number;
  slug: string;
  title: string;
  short: string;
  dilemma: string;
  thesis: string;
  stakes: string;
  minutes: number;
  icon: LucideIcon;
  options: DomainOption[];
  failures: FailureMode[];
  decisions: DecisionRule[];
  related: string[];
};

export type Incident = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  domains: string[];
};
