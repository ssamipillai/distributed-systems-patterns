# Quorum · Distributed Systems Patterns

> **An interactive field manual for the twelve architectural dilemmas that decide production systems.**

Tutorials end at the happy path. Production begins when two writers, a stale cache, and a polite retry agree to lie at the same time. **Quorum** is an interactive manual and sandbox for exploring those trade-offs with live visual labs.

---

## The Twelve Dilemmas

1. **Data Consistency, Transactions & State** (2PC vs. Sagas, Single-Leader, Quorum, CRDTs)
2. **Backpressure, Rate Limiting & Flow Control** (Token bucket, Leaky bucket, Concurrency limits)
3. **Resiliency, Timeouts & Circuit Breakers** (Cascading failures, Hedged requests, Jittered backoff)
4. **Caching Topology & Invalidation** (Write-through, Cache-aside, Thundering herds, Dogpiling)
5. **Distributed Consensus & Coordination** (Raft, Paxos, Zab, Split-brain mitigation)
6. **Partitioning, Sharding & Routing** (Consistent hashing, Virtual nodes, Range vs Hash partitioning)
7. **Storage Engines & Replication** (LSM-Trees vs B-Trees, Write amplification, Compaction)
8. **Event-Driven Architecture & Messaging** (At-least-once, Idempotency keys, Outbox pattern)
9. **Cell-Based Architecture & Blast Radius** (Cellular routing, Bulkheads, Fault domain isolation)
10. **Concurrency Control & Isolation Levels** (MVCC, Optimistic locking, Phantom reads, SSI)
11. **Configuration, Discovery & Feature Flags** (Dynamic config rollout, Gossip protocol, Heartbeats)
12. **Observability, Tracing & Debuggability** (Distributed context propagation, High-cardinality metrics)

---

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **UI & Components**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [Lucide Icons](https://lucide.dev)
- **Server Engine**: [Nitro](https://nitro.unjs.io)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs)
- **Deployment**: Ready for [Render](https://render.com), [Docker](https://www.docker.com), and [Vercel](https://vercel.com)

---

## Getting Started Locally

### Prerequisites
- Node.js 20+ (Node 22 recommended)
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will start on `http://localhost:8080`.

### Production Build

```bash
# Compile client and server
npm run build

# Start the compiled Nitro server
npm run start
```

---

## Deployment to Render

This repository includes [`render.yaml`](./render.yaml) for automated 1-click deployment to Render as a Node.js Web Service, as well as a [`Dockerfile`](./Dockerfile) for containerized deployments.

See the complete [Render Deployment Guide](./RENDER_DEPLOY.md) for step-by-step instructions.

---

## License

MIT
