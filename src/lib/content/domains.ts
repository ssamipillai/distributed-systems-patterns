import {
  Database,
  Timer,
  Layers,
  Radio,
  Waypoints,
  Shield,
  GlobeLock,
  Search,
  LayoutGrid,
  Share2,
  Flag,
  Cpu,
} from "lucide-react";
import type { Domain, Incident } from "./types";

export const DOMAINS: Domain[] = [
  {
    id: 1,
    slug: "consistency",
    title: "Data Consistency, Transactions & State",
    short: "Consistency",
    dilemma:
      "2PC vs. Sagas, Single-Leader vs. Quorum vs. CRDTs, atomic stock reservation, distributed locking without split-brain.",
    thesis:
      "You cannot distribute a write and keep a single, instantaneous truth unless you also distribute the wait. Every consistency story is a story about who blocks, who lies, and who pays for the lie later.",
    stakes:
      "Checkout, inventory, payments, and leadership election fail in public. A lock that “works in staging” is the classic split-brain: two winners, one ledger.",
    minutes: 8,
    icon: Database,
    options: [
      {
        name: "Two-phase commit",
        promise: "A single atomic commit decision across participants.",
        cost: "Blocking. Coordinator is a SPOF for uncertainty. Participants hold locks through crashes and GC pauses. Latency is the sum of the slowest prepare.",
        useWhen: "Few, co-located, reliable participants and the business truly cannot accept a partial commit (money movement between two rows you own).",
        avoidWhen: "Cross-service, cross-region, or any path where a participant can be slow. You will concentrate outage, not prevent it.",
      },
      {
        name: "Sagas",
        promise: "Forward progress under partial failure, with compensating actions.",
        cost: "Compensation is not rollback. Intermediate state is visible. Semantic undo (refund vs. void vs. restock) is a product problem wearing an architecture hat.",
        useWhen: "Long-running business processes spanning services you do not co-transactionally control.",
        avoidWhen: "You need isolation (no dirty reads of half-checkouts) or compensations that cannot be made safe (shipped goods, sent email, leaked secret).",
      },
      {
        name: "Single-leader replication",
        promise: "Linearizable writes at one place. Simple mental model.",
        cost: "The leader is a write bottleneck and a failover ceremony. Clients that follow a stale leader after partition will split-brain unless fenced.",
        useWhen: "A region’s worth of write throughput fits on one primary and failover of seconds is acceptable.",
        avoidWhen: "Multi-region write latency, or any leadership election without fencing tokens at the storage layer.",
      },
      {
        name: "Quorum (R + W > N)",
        promise: "Tunable overlap: a read is guaranteed to see at least one node from the last successful write.",
        cost: "Necessary, not sufficient, for linearizability. Needs versions, read repair, and no sloppy quorums. W = N kills write availability.",
        useWhen: "You can name N, tolerate some stale reads (W < N, R = 1) or pay for overlap, and you own repair.",
        avoidWhen: "You actually needed consensus (Raft/Paxos) and hoped quorum math would substitute for a log.",
      },
      {
        name: "CRDTs",
        promise: "Merge without coordination. Partitions heal by math, not by meetings.",
        cost: "The merge must match the business. LWW-registers lose carts. Sets tombstone-bloat. Counters cannot revoke cleanly without PN semantics.",
        useWhen: "Collaborative state, presence, likes, and any value where “both happened” is the correct answer.",
        avoidWhen: "Unique inventory, unique usernames, or money. If the merge is “pick one,” you wanted a leader.",
      },
    ],
    failures: [
      {
        name: "Split-brain lock",
        story: "A Redis SET NX EX lock expires while the holder is GC-paused. A second client acquires it. Both write the row. The lock was a suggestion.",
        signal: "Duplicate unique-key violations, two ‘owners’ in audit logs, or a fencing-token gap.",
        mitigate: "Storage must reject stale writers. Monotonic fencing token (ZooKeeper/etcd zxid, or a version column) checked on every write. TTL locks without fencing are not locks.",
      },
      {
        name: "Coordinator stall (2PC)",
        story: "PREPARE succeeded everywhere. COMMIT never arrived. Every participant holds row locks. The fleet is ‘healthy’ and fully stuck.",
        signal: "Lock wait graphs, XA in-doubt transactions, p99 climbing while CPU is idle.",
        mitigate: "Bound the transaction, prefer a single-row compare-and-swap, or accept a saga with an explicit in-doubt state the operator can see.",
      },
      {
        name: "Dirty saga read",
        story: "Inventory reserved, payment failed, compensation lagged. A second request saw reserved=true and told the customer it was gone — or the opposite, oversold.",
        signal: "State-machine metrics sitting in ‘pending’ longer than the SLA; support tickets that disagree with the DB.",
        mitigate: "Make pending a first-class state. Idempotency keys. Reservations as time-bounded leases, not flags.",
      },
    ],
    decisions: [
      {
        if: "The write is a unique physical resource (one SKU, one seat, one username)",
        then: "Single-row compare-and-swap or a sequential log in one partition. Lease + confirm, never a naked distributed lock.",
        why: "Atomicity lives where the bytes live. Coordination across machines is a rumor about those bytes.",
      },
      {
        if: "The process spans services and minutes",
        then: "Saga with leases, idempotent steps, and compensations you can actually run.",
        why: "A 2PC that lasts minutes is an outage with extra protocol.",
      },
      {
        if: "Two writers may both be ‘leaders’ after a partition",
        then: "Fencing token checked by the storage that matters, not by the locker.",
        why: "The lock service does not see the write. The database does.",
      },
    ],
    related: ["caching", "cells", "concurrency"],
  },
  {
    id: 2,
    slug: "caching",
    title: "Caching, CDN & Latency Optimization",
    short: "Caching",
    dilemma:
      "Edge CDN + Stale-While-Revalidate vs. multi-region active-active Redis vs. L1/L2 cache-aside, and the invalidation storm that follows a ‘simple’ key change.",
    thesis:
      "A cache is a bet that the past is a good enough future. The bet is cheap until a write, a deploy, or a celebrity key makes everyone collect at once.",
    stakes:
      "p95 is a cache hit-rate graph in disguise. Origin protection is a resiliency problem; stale product data is a consistency problem. You do not get to pick only one.",
    minutes: 7,
    icon: Timer,
    options: [
      {
        name: "Edge CDN + SWR",
        promise: "Millisecond reads near the user. Serve stale, refresh in the background, survive origin blips with stale-if-error.",
        cost: "A documented stale window. Purge is never instantaneous worldwide. Personalized HTML does not belong here.",
        useWhen: "Read-heavy, cacheable responses with a freshness SLA measured in seconds to minutes (assets, public JSON, PDPs).",
        avoidWhen: "Per-user private data, or inventory you already promised was exact.",
      },
      {
        name: "Multi-region active-active Redis",
        promise: "Sub-millisecond reads in every region, writes go to a local replica.",
        cost: "Replication lag is a consistency model. Conflict resolution (CRDT, LWW, last-region-wins) leaks into product. Failover is a split-brain drill.",
        useWhen: "Session, rate-limit counters, and derived data you can afford to converge.",
        avoidWhen: "The object is the source of truth. Redis is not your ledger.",
      },
      {
        name: "L1/L2 cache-aside",
        promise: "Process-local L1 (nanoseconds) in front of Redis L2 in front of the database. You control the fill.",
        cost: "Stampede on miss. The classic race: invalidate, concurrent read refills with the old row, write lands, cache lies.",
        useWhen: "Hot keys with compute-heavy assembly (authz decisions, composed product cards).",
        avoidWhen: "You have no single-flight, no jittered TTL, and no negative-caching policy — you will DDoS yourself.",
      },
    ],
    failures: [
      {
        name: "Invalidation storm",
        story: "A deploy changes the cache-key prefix. Hit rate falls off a cliff. Every pod stampedes origin. Autoscaling adds more stampeding pods.",
        signal: "Origin QPS step-function, CDN origin-offload collapse, CPU and DB connections move together.",
        mitigate: "Version keys gradually. Request coalescing (single-flight). Soft TTL + hard TTL (SWR). Origin bulkheads. Warm the new keyspace before the cut.",
      },
      {
        name: "Thundering herd on expiry",
        story: "A popular key was written with the same TTL everywhere. It expires on the minute. Ten thousand workers miss together.",
        signal: "Periodic QPS spikes aligned to TTL, not to traffic.",
        mitigate: "Jitter TTLs. Early refresh (expire at 80% with a lock). Collapse duplicate fills per key.",
      },
      {
        name: "Cache poisoning via race",
        story: "Write DB, delete cache. A reader sneaks in, loads the old row, SET. The delete was a no-op on a refill.",
        signal: "A record that ‘won’t update’ until TTL, despite writes succeeding.",
        mitigate: "Versioned values, compare-and-swap on fill, or short delayed second-delete. Prefer write-through for the few keys that must be right.",
      },
    ],
    decisions: [
      {
        if: "The object is public and the stale window is negotiable",
        then: "CDN with SWR and a hard TTL ceiling. Purge by surrogate-key, not by hoping.",
        why: "Edge hits do not queue on your thread pool.",
      },
      {
        if: "A miss is expensive and a stampede would take down origin",
        then: "Single-flight + jitter + bulkhead the origin path as if the cache were already on fire.",
        why: "Caches fail by succeeding too suddenly for everyone else.",
      },
      {
        if: "You are about to dual-write DB and cache as source of truth",
        then: "Stop. Cache is a memory. The database is the memory that survived the reboot.",
        why: "Dual-write without an outbox is two rumors.",
      },
    ],
    related: ["resiliency", "consistency", "search"],
  },
  {
    id: 3,
    slug: "storage",
    title: "Storage Architecture & Multi-Tenancy",
    short: "Storage",
    dilemma:
      "Shared schema + RLS vs. database-per-tenant vs. hybrid tiering. Shard keys, hot partitions, dynamic re-sharding.",
    thesis:
      "Tenancy is a blast-radius decision you make with a CREATE TABLE. A shared schema is an operational gift and a noisy-neighbor mortgage. The shard key is the one column you cannot shrug later.",
    stakes:
      "One enterprise export should not become everyone else’s p95. One RLS bug is a data leak with a press release. Re-sharding under write load is a dual-write window with extra fear.",
    minutes: 8,
    icon: Layers,
    options: [
      {
        name: "Shared schema + RLS",
        promise: "One cluster, one migration, one on-call. Policies pin every row to tenant_id.",
        cost: "Noisy neighbors. Index bloat. A missing WITH CHECK is a cross-tenant read. Transaction pooling plus SET app.tenant_id is a footgun.",
        useWhen: "Many small tenants, similar schemas, and you will invest in policy tests and per-tenant QoS.",
        avoidWhen: "Untrusted SQL, wildly different schemas, or a tenant that is 40% of your I/O.",
      },
      {
        name: "Database-per-tenant",
        promise: "Hard isolation. Custom schema, custom restore, custom noisy-neighbor immunity.",
        cost: "Migrations × N. Connection storms. Backup and observability become a fleet problem. ‘Are we on the same version?’ is now a product.",
        useWhen: "Large, regulated, or highly customizable tenants, counted in hundreds not hundreds of thousands.",
        avoidWhen: "A long tail of tiny tenants — you will drown in empty Postgreses and idle connections.",
      },
      {
        name: "Hybrid tiering",
        promise: "Pool the long tail; graduate noisy or paying tenants to dedicated.",
        cost: "A control plane. Move is a reshard. Product must not assume a tenant stays put.",
        useWhen: "SaaS with a Zipf tenant-size curve (it always is).",
        avoidWhen: "You cannot route queries by tenant at the edge of the data plane.",
      },
    ],
    failures: [
      {
        name: "Hot partition",
        story: "Shard key is tenant_id. One celebrity tenant owns a shard. You scale ‘the cluster’ and watch one disk melt.",
        signal: "One shard’s CPU/IOPS at ceiling, the rest bored. p99 is that shard.",
        mitigate: "Compound keys (tenant_id, entity_id) or hash-split the hot tenant. Isolate it to dedicated hardware. Never shard on a low-cardinality enum.",
      },
      {
        name: "RLS bypass",
        story: "A reporting query uses a role that bypasses RLS. Or a connection returns to the pool with the previous tenant’s SET still on.",
        signal: "Anomalous cross-tenant IDs in logs; ‘impossible’ foreign keys.",
        mitigate: "FORCE ROW LEVEL SECURITY. SET LOCAL in a transaction you own, or pass tenant as a bound parameter the policy reads. Integration tests that attempt theft.",
      },
      {
        name: "Re-shard dual-write gap",
        story: "Migrating a tenant, dual-writing old and new. A read-your-write misses the new shard. Or cutover happens twice.",
        signal: "Row counts disagree; unique violations on the destination.",
        mitigate: "Pause writes or use a log-based copy with a recorded LSN. Idempotent apply. Shadow reads before cutover.",
      },
    ],
    decisions: [
      {
        if: "Tenant sizes follow a power law",
        then: "Hybrid: shared pool + graduation. Design the router on day one.",
        why: "The 99th-percentile tenant is the architecture, not the average one.",
      },
      {
        if: "You must pick a shard key now",
        then: "High cardinality, even write distribution, present on every query you cannot afford to scatter.",
        why: "A shard key is a one-way door with a moving van on the other side.",
      },
      {
        if: "RLS is the isolation boundary",
        then: "Treat policy tests as security tests. Assume connection reuse will try to betray you.",
        why: "The database cannot remember who you meant unless you tell it every time.",
      },
    ],
    related: ["cells", "concurrency", "edge-auth"],
  },
  {
    id: 4,
    slug: "streaming",
    title: "Streaming, Queues & Event-Driven Systems",
    short: "Streaming",
    dilemma:
      "Kafka vs. RabbitMQ vs. Cloud Tasks. At-least-once vs. exactly-once processing, out-of-order delivery, dead-letter queues.",
    thesis:
      "A queue is a deferred function call. A log is a deferred function call you can rewind. Most ‘exactly-once’ is ‘at-least-once plus an idempotent sink.’ The rest is marketing.",
    stakes:
      "Double charges, missed webhooks, and a DLQ that becomes a graveyard. Order is a lie the partition tells you — until you scale the consumers.",
    minutes: 8,
    icon: Radio,
    options: [
      {
        name: "Kafka (the log)",
        promise: "Durable, replayable, partitioned total order per key. Consumer groups. High throughput.",
        cost: "Operational gravity. Not a task queue: no per-message TTL routing, no easy delay without hacks. Compaction is a feature you will misuse.",
        useWhen: "Event sourcing, CDC fan-out, activity streams, multiple independent consumers of the same facts.",
        avoidWhen: "RPC-shaped work with per-task retry/delay and no need to replay. You wanted a work queue.",
      },
      {
        name: "RabbitMQ (the broker)",
        promise: "Competing consumers, flexible routing, ack/nack, TTL, DLX. Messages leave when done.",
        cost: "No replay. Memory and disk alarms. Ordering is per-queue and evaporates with competing consumers.",
        useWhen: "Task distribution, command buses, work that should vanish after success.",
        avoidWhen: "You will be asked ‘replay Friday’s events’ or ‘add a new consumer to history.’",
      },
      {
        name: "Cloud Tasks / SQS-shaped queues",
        promise: "Almost no ops. HTTP workers, backoff, dead-letter after N. Someone else pages for the broker.",
        cost: "Less control: ordering (or not), payload limits, visibility timeout as your lease. Vendor semantics become yours.",
        useWhen: "Deferred HTTP work, fan-out you do not want to run, one-shot jobs.",
        avoidWhen: "High-volume log processing or multi-consumer replay.",
      },
    ],
    failures: [
      {
        name: "Duplicate side effects",
        story: "Worker did the work, crashed before ack. Redelivery charges the card again.",
        signal: "Idempotency-key collisions; ‘double webhook’ tickets; DLQ of already-succeeded jobs.",
        mitigate: "Idempotency keys stored with the effect. Transactional outbox for produce. Treat ‘exactly-once’ as a property of the sink.",
      },
      {
        name: "Out-of-order apply",
        story: "Partition key was user_id until a new producer hashed on session_id. Updates apply as delete, then create, then a stale update.",
        signal: "State that flickers; version going backwards; ‘user vanished and came back.’",
        mitigate: "Stable keys. Version/vector on the entity. Ignore stale (last-write-wins with a clock you trust, or explicit versions).",
      },
      {
        name: "DLQ as landfill",
        story: "Poison JSON hits the parser. Retry budget expires. Nobody owns the DLQ. The business thinks the pipeline is ‘done.’",
        signal: "DLQ depth monotonically up; age of oldest message in days.",
        mitigate: "Redrive with a budget. Alert on depth and age. Poison messages get a ticket, not a retry loop.",
      },
    ],
    decisions: [
      {
        if: "Multiple consumers need the same history, including future ones",
        then: "A log (Kafka or equivalent), not a queue.",
        why: "Queues forget. Logs remember on purpose.",
      },
      {
        if: "The consumer has a side effect on the world",
        then: "At-least-once delivery and an idempotent handler. Period.",
        why: "Networks retry. Crashes retry. Your code must be the thing that does not.",
      },
      {
        if: "You need delay, fan-out by routing key, and competing consumers",
        then: "A broker or Cloud Tasks. Do not fake a delay queue with Kafka without a design review.",
        why: "The log will let you, then charge interest.",
      },
    ],
    related: ["consistency", "microservices", "search"],
  },
  {
    id: 5,
    slug: "microservices",
    title: "Microservices, API Design & Ingress",
    short: "APIs",
    dilemma:
      "Sync blocking vs. async job (202 Accepted + Location) vs. webhooks. BFF pattern. gRPC streaming vs. REST.",
    thesis:
      "The API is a contract about time. A synchronous 200 says ‘it is done.’ A 202 says ‘it exists as a promise.’ A webhook says ‘I will find you.’ Pick the one that matches the work, not the one that matches the tutorial.",
    stakes:
      "Gateway timeouts, chatty frontends, and a BFF that became the monolith you split. Mobile clients on bad networks do not want your 30-second checkout hold.",
    minutes: 7,
    icon: Waypoints,
    options: [
      {
        name: "Synchronous blocking",
        promise: "One request, one answer, one trace. Easy to reason about when it is fast.",
        cost: "Availability multiplies (A^n). Timeouts compose poorly. The client’s retry is your retry storm.",
        useWhen: "Work is bounded (tens of ms to a couple of seconds) and the user must have the result to continue.",
        avoidWhen: "Anything that waits on email, humans, batch ML, or another team’s p99.",
      },
      {
        name: "202 Accepted + Location",
        promise: "The work is a resource. Poll or subscribe for status. The request thread is free.",
        cost: "Client complexity. Status resource lifecycle. Users hate polling if you do not also push.",
        useWhen: "Exports, video, provisioning, payments that must round-trip a processor.",
        avoidWhen: "The job is 40ms. You added asynchrony as fashion.",
      },
      {
        name: "Webhooks",
        promise: "Push the result to a URL the caller named. Decouple runtimes.",
        cost: "Their endpoint, your retry budget. Signatures, replay, ordering, and ‘we rotated the secret.’",
        useWhen: "Partner integrations and domain events other companies must consume.",
        avoidWhen: "First-party UI — use websocket/SSE or poll your own status resource.",
      },
      {
        name: "BFF + gRPC interior",
        promise: "One client-shaped HTTP/JSON at the edge; typed streaming interiors. Aggregation happens near the user.",
        cost: "A BFF per client can fork business rules. gRPC through public internet and some load balancers is a story.",
        useWhen: "Mobile and web need different shapes; interior services are chattier than the public contract.",
        avoidWhen: "The BFF starts owning writes that belong in a domain service.",
      },
    ],
    failures: [
      {
        name: "Timeout sandwich",
        story: "Gateway 10s, service 30s, dependency 60s. The client retries at 10s. The original work is still running. You did it twice.",
        signal: "Duplicate creates; dependency QPS > inbound QPS.",
        mitigate: "Timeouts strictly decrease inward. Idempotency keys on all mutating requests. Hedged requests only where the handler is safe.",
      },
      {
        name: "Chatty frontend",
        story: "The SPA makes 40 REST calls to compose a page. Mobile on LTE looks like an outage.",
        signal: "Waterfalls in traces; TTFB fine, time-to-interactive terrible.",
        mitigate: "BFF or a well-bounded GraphQL. Fetch in parallel where you must, but stop shipping your service map to the browser.",
      },
      {
        name: "Unsigned webhook replay",
        story: "An attacker POSTs last week’s body to the endpoint. Or a partner retries with a different event id.",
        signal: "Out-of-order side effects; events with timestamps in the past accepted as new.",
        mitigate: "HMAC + timestamp window + event id de-dupe. Never trust the body for identity.",
      },
    ],
    decisions: [
      {
        if: "The user can continue without the final result",
        then: "202 + status resource. Push if you have a channel.",
        why: "Holding a thread is not a UX.",
      },
      {
        if: "Two clients need two shapes of the same domain",
        then: "BFF for reads. Domain services for writes.",
        why: "Aggregation is a view. Invariants are not.",
      },
      {
        if: "Interior fan-out is high and typed",
        then: "gRPC (streaming if it is a stream). REST/JSON at the public door.",
        why: "Protobuf is a gift to servers and a tax on browsers.",
      },
    ],
    related: ["streaming", "resiliency", "edge-auth"],
  },
  {
    id: 6,
    slug: "resiliency",
    title: "Resiliency, Retries & Observability",
    short: "Resiliency",
    dilemma:
      "Flapping node detection, SWIM gossip, circuit breakers, bulkhead thread pools, retry storms, jitter.",
    thesis:
      "Failure is correlated. Your retry is someone else’s load. A circuit breaker is a polite way of saying ‘we will not help you die faster.’ Observability is how you know which of those sentences is true right now.",
    stakes:
      "A 2% error rate plus synchronized retries is a self-DDoS. A flapping node that you never eject poisons every replica set it touches.",
    minutes: 8,
    icon: Shield,
    options: [
      {
        name: "Circuit breaker",
        promise: "Fail fast when a dependency is dark. Half-open probes for recovery.",
        cost: "A breaker wrapping a slow-success path never trips (no errors, just threads). Shared breakers couple unrelated calls.",
        useWhen: "Out-of-process dependencies with a failure mode of ‘error or timeout,’ not ‘hang forever without a timeout.’",
        avoidWhen: "You have no timeout. The breaker is then décor.",
      },
      {
        name: "Bulkheads",
        promise: "A bad dependency can exhaust only its pool, not the process.",
        cost: "You must size pools. Too small: self-inflicted throttling. Too large: the bulkhead was a suggestion.",
        useWhen: "Any process that talks to more than one dependency (that is all of them).",
        avoidWhen: "A single shared executor ‘for convenience.’ Convenience is the coupling.",
      },
      {
        name: "Retry with full jitter",
        promise: "Transient faults disappear. Decorrelated sleep stops the thundering herd.",
        cost: "Retries multiply traffic. Non-idempotent retries duplicate the world. Capped exponential without jitter still synchronizes.",
        useWhen: "Idempotent reads and well-keyed writes, with a budget (count × time) and a breaker behind them.",
        avoidWhen: "The error is 400, 401, 403, or a 409 you caused. Retrying a bad request is optimism as a service.",
      },
      {
        name: "SWIM / gossip membership",
        promise: "Failure detection that scales, with suspicion before declaration, without a central health oracle.",
        cost: "False accusations under packet loss. Suspicion timeouts are a product of the network you actually have.",
        useWhen: "Dynamic clusters of more than a handful of nodes (Consul, memberlist, Serf-shaped problems).",
        avoidWhen: "A static trio of databases. You wanted Raft, not gossip.",
      },
    ],
    failures: [
      {
        name: "Retry storm",
        story: "A dependency hiccups for 800ms. Every caller retries at the same backoff. The recovery is larger than the outage.",
        signal: "Outbound QPS >> inbound; error rate heals then immediately relapses.",
        mitigate: "Full jitter. Retry budgets. Hedging only on tail latency for safe reads. Breakers + load-shed at the edge.",
      },
      {
        name: "Flapping",
        story: "A node fails a check, is ejected, recovers, rejoins, fails. Caches empty, connections churn, leadership oscillates.",
        signal: "Membership churn, constant warmup, ‘it works if I ignore that host.’",
        mitigate: "Hysteresis: separate unhealthy and healthy thresholds. Slow rejoin. Probe from multiple peers (SWIM ping-req).",
      },
      {
        name: "Thread-pool contagion",
        story: "The billing client’s pool shares the default executor. Billing hangs. Health checks, inbound HTTP, and everything else wait.",
        signal: "One dependency’s latency becomes the process’s latency. Liveness probes fail.",
        mitigate: "Named bulkheads. Timeouts on every outbound call. Isolate health endpoints from business executors.",
      },
    ],
    decisions: [
      {
        if: "A dependency can be slow or gone",
        then: "Timeout + bulkhead + breaker, in that order. Retries last, and jittered.",
        why: "Without a timeout there is no failure, only a future.",
      },
      {
        if: "Recovery must not amplify",
        then: "Full jitter and a retry budget that is a fraction of remaining SLA.",
        why: "Synchronized courtesy is still a stampede.",
      },
      {
        if: "You cannot see which pool is exhausted",
        then: "Metrics per bulkhead, per dependency, per outcome (ok / timeout / rejected / retried).",
        why: "Resiliency without instrumentation is a superstition.",
      },
    ],
    related: ["caching", "microservices", "cells"],
  },
  {
    id: 7,
    slug: "edge-auth",
    title: "Edge Security, Auth & Multi-Region Topology",
    short: "Edge & Auth",
    dilemma:
      "CDN-hosted SPA auth, SameSite cookies vs. Bearer JWTs, edge BFF token termination, cross-region active-active routing.",
    thesis:
      "Where the token lives is the security model. A CDN can hold your HTML; it should not hold your session in localStorage. Multi-region auth is a revocation problem wearing a latency costume.",
    stakes:
      "XSS that exfiltrates a Bearer token is account takeover. A global cookie with SameSite=None is a CSRF story. A ‘global’ login that cannot revoke in the other region is a ghost session.",
    minutes: 8,
    icon: GlobeLock,
    options: [
      {
        name: "httpOnly SameSite cookies",
        promise: "The browser holds the session; JS cannot read it. CSRF surface is constrained by SameSite.",
        cost: "Cross-site embeds break. Strict blocks some navigations you wanted. You need a CSRF plan for SameSite=None, and a domain plan for APIs on another host.",
        useWhen: "First-party web apps where the API shares a parent domain.",
        avoidWhen: "Native apps, or a public API consumed by arbitrary origins — they cannot (and should not) use your cookies.",
      },
      {
        name: "Bearer JWT in memory (SPA)",
        promise: "Stateless verification, easy cross-origin. XSS must already be running to steal a memory-only token.",
        cost: "Refresh tokens in localStorage are loot. Revocation is a denylist or short TTL. Tab isolation is on you.",
        useWhen: "Short-lived access tokens, refresh in an httpOnly cookie on a dedicated auth domain, or native clients with a secure store.",
        avoidWhen: "Access token in localStorage ‘because Redux.’ That is a gift to the next XSS.",
      },
      {
        name: "Edge BFF token termination",
        promise: "The CDN/worker holds the cookie, talks to origin with an internal identity. The SPA never sees a token.",
        cost: "The edge is now in the auth path. Key distribution, session store locality, and a new SPOF if you put a single global session cache in front.",
        useWhen: "Static SPA at the edge plus a same-site BFF. This is the grown-up pattern for CDN-hosted apps.",
        avoidWhen: "The worker forwards the user’s cookie to random upstreams. Termination means termination.",
      },
    ],
    failures: [
      {
        name: "XSS exfiltrates Bearer",
        story: "A dependency’s script wakes up, reads localStorage.access_token, posts it abroad. httpOnly would have made this a same-origin nuisance instead of a theft.",
        signal: "Impossible logins from new geos immediately after a script injection; tokens used after logout.",
        mitigate: "Do not put refresh tokens in JS-visible storage. CSP. Short access TTL. Rotate refresh. Prefer cookies for browsers.",
      },
      {
        name: "CSRF on a cookie session",
        story: "SameSite=None; Secure for a cross-site widget. A hostile page POSTs to your API with the user’s cookies.",
        signal: "State-changing requests with no custom header from third-party referrers.",
        mitigate: "SameSite=Lax or Strict for first-party. Double-submit or CSRF token for None. Origin/Referer checks.",
      },
      {
        name: "Revocation lag across regions",
        story: "User logs out in eu-west. ap-south still accepts the JWT for 15 minutes. Or the session store is regional and sticky routing broke.",
        signal: "‘I logged out’ tickets; stolen-token use after reset.",
        mitigate: "Short-lived access plus regional session for refresh. Global denylist for emergencies (password reset) with a tight TTL. Sticky is not a security control.",
      },
    ],
    decisions: [
      {
        if: "The client is a browser on your site",
        then: "httpOnly cookie + edge BFF. SPA stores nothing of value.",
        why: "XSS is common. Cookie theft via JS should be impossible by construction.",
      },
      {
        if: "The client is native or a third-party developer",
        then: "Bearer access tokens, sender-constrained if you can (DPoP/mTLS), refresh in a secure store.",
        why: "Cookies are a browser primitive, not an API primitive.",
      },
      {
        if: "Active-active regions serve auth",
        then: "Design logout and password-reset as globally urgent, everything else as locally sticky with bounded lag.",
        why: "Revocation is the one consistency problem users will file as a breach.",
      },
    ],
    related: ["microservices", "cells", "config"],
  },
  {
    id: 8,
    slug: "search",
    title: "High-Scale Algorithms & Search Systems",
    short: "Search",
    dilemma:
      "Dual-write vs. log CDC to Elasticsearch, local in-memory vs. distributed Bloom filters, rate-limiting algorithms.",
    thesis:
      "Search is a derived view. Rate limits are a derived view of intent. Bloom filters are a derived view of set membership that is allowed to lie in one direction. Treat them all as views, and the dual-write temptation dies.",
    stakes:
      "An index that lags checkout is a support queue. A rate limiter that is not shared is a suggestion. A Bloom filter with a 5% FPR on a hot path is a 5% extra origin load — or a 5% wrong ‘already exists.’",
    minutes: 7,
    icon: Search,
    options: [
      {
        name: "Dual-write to search",
        promise: "Simple. App writes Postgres and Elasticsearch in one handler.",
        cost: "Two commits, one failure mode. Partial success desynchronizes forever unless you reconcile. No cursor.",
        useWhen: "Prototypes, or a view so cheap you can rebuild it nightly and nobody pages.",
        avoidWhen: "The index is user-facing and must converge. This pattern is how ‘search is wrong’ becomes a lifestyle.",
      },
      {
        name: "CDC / outbox to the index",
        promise: "The log is the contract. Replay, lag metrics, schema evolution with a consumer version.",
        cost: "Debezium/outbox ops. Mapping relational deletes to index deletes. Mapping transactions to documents.",
        useWhen: "Any search index you would be embarrassed to rebuild by hand after a bad deploy.",
        avoidWhen: "You cannot identify a primary key for the document. CDC will happily replicate your confusion.",
      },
      {
        name: "Bloom filters (local vs. distributed)",
        promise: "O(1) ‘definitely not in the set’ with tiny memory. Skip the cache, skip the disk, skip the RPC.",
        cost: "False positives. No false negatives — unless you delete without a counting Bloom or a rebuild. Distributed Blooms need a gossip or a RedisBloom.",
        useWhen: "Negative caching, ‘have we seen this ID,’ URL blocklists, avoiding a remote check you expect to miss.",
        avoidWhen: "Positive existence is a billing event. A false positive must be cheap to confirm.",
      },
      {
        name: "Rate-limit algorithms",
        promise: "Token bucket (burst), leaky bucket (smooth), sliding-window log (accurate), sliding-window counter (cheap-ish).",
        cost: "Local limiters are bypassed by many replicas. Fixed windows allow double-burst at the edges. Accuracy costs memory.",
        useWhen: "You can name the key (user, IP, token), the budget, and whether burst is a feature.",
        avoidWhen: "You rate-limit in the app and also in the mesh and also at the CDN with three different keys.",
      },
    ],
    failures: [
      {
        name: "Index drift",
        story: "ES write failed, DB write succeeded. Or a retry created a ghost document after a delete.",
        signal: "Search totals ≠ table counts; customers find ‘deleted’ records.",
        mitigate: "Outbox/CDC, idempotent upserts by PK, periodic checksums, a rebuild path you have actually run.",
      },
      {
        name: "Bloom false-positive as truth",
        story: "‘Username taken’ because the filter said maybe. Support explains hashing to a founder.",
        signal: "Spurious collisions; extra origin load matching the predicted FPR.",
        mitigate: "Always confirm positives. Size the filter for the FPR you can afford on the miss path.",
      },
      {
        name: "Fixed-window double burst",
        story: "100 req/min limiter. User sends 100 at 00:59 and 100 at 01:00. You allowed 200 in two seconds.",
        signal: "Traffic cliffs at wall-clock boundaries.",
        mitigate: "Sliding window or token bucket. Do not use a naïve INCR+EXPIRE minute key for anything hostile traffic will notice.",
      },
    ],
    decisions: [
      {
        if: "The index must converge with the source of truth",
        then: "Outbox or CDC. Dual-write is a bug with a checklist.",
        why: "Two writes are two failure domains.",
      },
      {
        if: "You need to avoid a remote negative lookup",
        then: "A Bloom sized for a known FPR, with a real check on maybe-yes.",
        why: "The filter is allowed to cry wolf. It is not allowed to be the wolf.",
      },
      {
        if: "Rate limits must hold across replicas",
        then: "A shared store (Redis token bucket) or an edge limiter. Local in-memory is a courtesy.",
        why: "Horizontal scale otherwise multiplies the budget.",
      },
    ],
    related: ["streaming", "caching", "resiliency"],
  },
  {
    id: 9,
    slug: "cells",
    title: "Cell-Based Architecture & Blast Radius",
    short: "Cells",
    dilemma:
      "Compartmentalization, independent cell data stores, regional routing without a single point of failure.",
    thesis:
      "A cell is a complete copy of the serving stack with its own data, sized so that its total failure is an acceptable incident. If cells share a database, a deployer, or a global router that can fail closed, they are a costume.",
    stakes:
      "One bad deploy, one hot key, one AZ fire — the question is what fraction of customers go with it. ‘We are multi-AZ’ is not an answer if the control plane is not.",
    minutes: 7,
    icon: LayoutGrid,
    options: [
      {
        name: "Monolith / shared data plane",
        promise: "Simple routing. One place to query. Efficiency of a shared fleet.",
        cost: "Blast radius is the fleet. A poison query or a bad migration is everyone.",
        useWhen: "Early systems, or when the blast of a full outage is still acceptable (it stops being so quietly).",
        avoidWhen: "You have enterprise contracts with uptime that assumes isolation you do not have.",
      },
      {
        name: "Cells with independent stores",
        promise: "Failure, deploy, and noisy neighbors stop at the cell wall. Shuffle sharding makes overlapping fate rare.",
        cost: "You now operate N smaller systems. Cross-cell queries are forbidden or expensive. Sticky identity of a tenant to a cell is a product constraint.",
        useWhen: "Multi-tenant SaaS at a scale where a 100% outage is existential and a 5% outage is a Tuesday.",
        avoidWhen: "Your domain model requires global transactions across all tenants as a common path.",
      },
      {
        name: "Regional cells + dumb routing",
        promise: "DNS, anycast, or client-side cell maps. No global proxy that must be healthy for anyone to be healthy.",
        cost: "Routing freshness. A stale cell map sends users to the dead. Control-plane updates must fail open.",
        useWhen: "Always, if you are going to bother with cells.",
        avoidWhen: "A single global load balancer as the only door — that door is the product.",
      },
    ],
    failures: [
      {
        name: "Shared brain",
        story: "Cells have their own app pools. They share one cluster of Postgres, one Redis, one feature-flag CDN path that went 404.",
        signal: "‘Cell-aware’ dashboards that still correlate 1.0 on every incident.",
        mitigate: "List shared things. Each one is a max-blast-radius of 1.0. Eliminate or degrade-open them.",
      },
      {
        name: "Smart router SPOF",
        story: "A global cell-router service assigns tenants. It times out. Now no cell can be reached, including the healthy ones.",
        signal: "Error rate 100% while cell health is green.",
        mitigate: "Client or edge has a last-known cell. Router fail-open. Bake maps into config with a long TTL.",
      },
      {
        name: "Uneven cells",
        story: "Shuffle sharding in theory; in practice one cell got the three largest tenants. It is now the fleet.",
        signal: "One cell’s saturation, the others idle. That cell’s incidents are ‘the outage.’",
        mitigate: "Rebalance. Cap cell size in tenants and in QPS. Graduate whales. Measure imbalance as an SLO.",
      },
    ],
    decisions: [
      {
        if: "A complete outage would be a company-level event",
        then: "Cells, with data isolation, sized to a blast you can publicly describe.",
        why: "Availability is a fraction. Architecture sets the denominator.",
      },
      {
        if: "A component is shared across cells",
        then: "It must fail open or be out of the request path.",
        why: "Shared + fail-closed = one cell, theatrically subdivided.",
      },
      {
        if: "Routing needs a lookup",
        then: "Cache the answer at the edge with a stale-if-error map.",
        why: "The map’s availability has to exceed the cells’.",
      },
    ],
    related: ["storage", "resiliency", "edge-auth"],
  },
  {
    id: 10,
    slug: "permissions",
    title: "Graph & Permission Traversal",
    short: "Permissions",
    dilemma:
      "Recursive RPC vs. recursive DB CTE vs. asynchronous iterative worker task queues for massive permission graphs.",
    thesis:
      "Authorization is a reachability query. Recursion looks like a function and behaves like a fan-out attack on your tail latency. At Zanzibar scale you stop asking the graph a question and start maintaining the answer.",
    stakes:
      "A nested-folder share can turn a 2ms check into a 2s check. A wrong ‘yes’ is a breach. A slow ‘no’ is an outage that looks like auth.",
    minutes: 7,
    icon: Share2,
    options: [
      {
        name: "Recursive RPC",
        promise: "Each service knows its local edges (this folder’s parent, this group’s members). Walk them live.",
        cost: "N+1 with extra network. Partial failure mid-walk. Amplification: one check is a tree of calls. Caches go stale independently.",
        useWhen: "Shallow, stable graphs (depth 2–3) and you already have the services.",
        avoidWhen: "Groups-in-groups, nested folders, or org charts that resemble real companies.",
      },
      {
        name: "Recursive CTE / in-database walk",
        promise: "One round trip. The planner and indexes do the expansion. Transactions see a consistent cut.",
        cost: "The database becomes the authorization system. Deep or wide graphs explode working memory. Cache-hostile. A hot org hammers one instance.",
        useWhen: "The graph fits in a database you already trust, with bounded depth and good closure indexes.",
        avoidWhen: "User-generated nesting with no depth cap. You will learn the cap from an incident.",
      },
      {
        name: "Async iterative workers (materialized reachability)",
        promise: "Walk in the background, store usersets or a closure table, serve checks from a cache/Zanzibar-like relation tuple store.",
        cost: "Authorization becomes eventually consistent. Revoke-must-be-fast is a first-class SLO. The worker backlog is a security queue.",
        useWhen: "Large, nested, collaborative graphs (docs, ACL, IAM at scale).",
        avoidWhen: "You cannot tolerate ‘access lingered for 8s after revoke’ and you have not built a fast invalidation path.",
      },
    ],
    failures: [
      {
        name: "Check amplification",
        story: "A file in a folder in a shared drive in a group in a group. One GET /file fans out to 400 membership RPCs.",
        signal: "Authz QPS >> user QPS; p99 of ‘metadata’ dwarfs content.",
        mitigate: "Bounded depth. Batch. Cache usersets. Stop RPC-walking on the request path past a budget.",
      },
      {
        name: "CTE timeout as 403",
        story: "The walker hits max recursion or statement timeout. The API translates that as ‘access denied.’",
        signal: "Intermittent 403s on large orgs, fine on small ones; DB CPU cliffs.",
        mitigate: "Never map failure to deny without a distinct error. Cap depth in the product. Precompute closures for heavy tenants.",
      },
      {
        name: "Revoke lag",
        story: "Materialized membership still says yes. An ex-employee reads the doc for ninety seconds. Or a day, if the worker is stuck.",
        signal: "Audit shows access after removal; worker lag histograms.",
        mitigate: "SLO on revoke. Invalidation bus that is fail-loud. Synchronous revoke for the hottest relations.",
      },
    ],
    decisions: [
      {
        if: "Depth is bounded and small",
        then: "CTE or a single-service walk with a hard recursion budget.",
        why: "Do not build Zanzibar for a three-level org chart.",
      },
      {
        if: "The graph is wide, nested, and user-shaped",
        then: "Relation tuples + cached usersets, async expansion, fast invalidate on revoke.",
        why: "Live recursion will eventually find a graph that looks like the internet.",
      },
      {
        if: "Deny and fail must be distinguishable",
        then: "Separate error classes, and never fail closed into 403 without a reason code.",
        why: "A timeout is not a moral judgment about the user.",
      },
    ],
    related: ["microservices", "streaming", "caching"],
  },
  {
    id: 11,
    slug: "config",
    title: "Configuration & Feature Flag Propagation",
    short: "Flags",
    dilemma:
      "Centralized pull vs. GitOps vs. event-driven push / streaming client updates across thousands of instances.",
    thesis:
      "A flag is a remote function call you cached. Propagation is a consistency problem with an on-call. The dangerous flags are the ones that must flip together — migrations, protocol versions, kill switches that must not flap.",
    stakes:
      "A kill switch that takes eight minutes to reach 30% of pods is not a kill switch. A flag that reaches half the fleet is a split-brain deploy.",
    minutes: 6,
    icon: Flag,
    options: [
      {
        name: "Centralized pull",
        promise: "Pods poll. Simple. The server is dumb. Last-known-good lives on disk.",
        cost: "Poll interval is your SLO. Aligned intervals are a thundering herd. The config server’s availability is now everyone’s availability unless you cache hard.",
        useWhen: "Hundreds of instances, flags that can lag by tens of seconds, a boring HTTP file or LaunchDarkly-style SDK in poll mode.",
        avoidWhen: "Kill switches, or a fleet of tens of thousands polling every 2s.",
      },
      {
        name: "GitOps",
        promise: "Review, audit, rollback, the same path as code. What ran is what merged.",
        cost: "Humans and reconcilers in the path. Not a millisecond control loop. Secrets do not belong next to flags without a plan.",
        useWhen: "Rare, consequential, reviewed changes (protocol versions, entitlement defaults, terraform-shaped config).",
        avoidWhen: "Experimentation, per-user ramps, or anything a PM should move without a merge queue.",
      },
      {
        name: "Event-driven push / streaming",
        promise: "Seconds-to-consistent across the fleet. Server streams diffs. Clients keep a cache and a heartbeat.",
        cost: "The stream is a dependency. Reconnect storms. Ordering. A silent stall looks like ‘flags are fine’ if you do not measure age.",
        useWhen: "Large fleets, kill switches, progressive delivery that must actually be progressive.",
        avoidWhen: "You have no last-known-good and no age metric — a dead stream will freeze an old world.",
      },
    ],
    failures: [
      {
        name: "Split fleet",
        story: "Half the pods have migration_read_new=true. Dual-write was off. You wrote two schemas and read one.",
        signal: "Error cliffs on a percentage matching the poll/push coverage; ‘works on some instances.’",
        mitigate: "Flag sequencing as a state machine (write both → read new → stop old). Gate on observed coverage, not on wall time.",
      },
      {
        name: "Herd on the config host",
        story: "A restart aligns every poller. Or a push disconnects the fleet and they all reconnect with the same backoff.",
        signal: "Config QPS spike; unrelated pods slow because they wait on flags at boot.",
        mitigate: "Jittered polls and reconnects. Disk cache so boot does not require the network. Bulkheads.",
      },
      {
        name: "Silent freeze",
        story: "The stream dies. SDKs serve cached flags forever. You flip a kill switch in the UI and nothing happens.",
        signal: "Flag age histogram; ‘last successful fetch’ stale; UI disagrees with probes.",
        mitigate: "Alert on flag age. Fail-safe defaults for kill switches (a local file, a well-known URL with SWR).",
      },
    ],
    decisions: [
      {
        if: "The flag can be wrong for 30 seconds",
        then: "Pull with jitter and a disk cache. Do not overbuild.",
        why: "Most flags are not kill switches, and most kill switches are not flags.",
      },
      {
        if: "The flag is a migration bit",
        then: "Treat it as a distributed state machine with coverage gates, not a boolean you toggle on Friday.",
        why: "A 50/50 split is a dual-write you did not consent to.",
      },
      {
        if: "You need a fleet-wide off in seconds",
        then: "Push/stream plus a side channel (SWR file at the edge) that fail-opens to ‘off’ for kill switches.",
        why: "One channel is a SPOF. Kill switches deserve two.",
      },
    ],
    related: ["resiliency", "edge-auth", "cells"],
  },
  {
    id: 12,
    slug: "concurrency",
    title: "Thread Safety, Concurrency & Local State",
    short: "Concurrency",
    dilemma:
      "Lock-free data structures, actor model vs. thread pools, semaphore bulkheads, local resource contention.",
    thesis:
      "Inside one process the network is a cache line and the partition is a mutex. Most ‘distributed’ incidents start as local contention that escaped: a global lock, a single-thread event loop, a pool of 8 serving 8,000.",
    stakes:
      "p99 is often lock wait. A lock-free structure you cannot prove is a heisenbug generator. Actors make the mailbox the queue you forgot to bound.",
    minutes: 7,
    icon: Cpu,
    options: [
      {
        name: "Mutex / striped locks",
        promise: "Obvious critical sections. Stripes recover parallelism when keys are independent.",
        cost: "Convoying. Priority inversion. False sharing if stripes share a cache line. Global mutexes serialize the machine.",
        useWhen: "Coarse sections you can keep tiny, or naturally partitioned keys (per-connection, per-tenant shard).",
        avoidWhen: "The lock is held across I/O. That is a process-wide outage with extra stack traces.",
      },
      {
        name: "Lock-free structures",
        promise: "Progress without sleeping. Queues, counters, maps under the right invariants.",
        cost: "ABA, memory ordering, and a testing story that looks like a paper. ‘Lock-free’ is not ‘wait-free’ and not ‘faster’ under low contention.",
        useWhen: "Hot counters, SPSC/MPSC queues, and cases you can borrow a known-good implementation.",
        avoidWhen: "You invented a concurrent map before lunch. Use the standard library’s, or a mutex.",
      },
      {
        name: "Actors / single-threaded mailboxes",
        promise: "No shared mutable state. Sequential reasoning per actor. Location transparency if you want to regret it later.",
        cost: "The mailbox is an unbounded queue until it is not (OOM). Head-of-line blocking. Reentrancy (especially virtual actors) reintroduces races.",
        useWhen: "Per-entity serialization (one actor per order, per device) is the actual invariant you need.",
        avoidWhen: "Work is embarrassingly parallel and the actor becomes a global bottleneck (one ‘UserService’ actor).",
      },
      {
        name: "Thread / task pools + semaphores",
        promise: "Bound concurrency. Queue delay becomes visible. Bulkheads are just named pools.",
        cost: "Pool exhaustion looks like a freeze. Queueing delay is latency you did not budget. Context-switch tax if you over-thread.",
        useWhen: "Blocking I/O, mixed workloads, anything that can otherwise eat the process.",
        avoidWhen: "A single default pool for CPU, disk, and the network. That is how a DNS timeout becomes a missed health check.",
      },
    ],
    failures: [
      {
        name: "Lock convoy",
        story: "A popular mutex is taken for a cache fill that hits the network. Everyone else waits, in order, for a gift they will not receive in time.",
        signal: "Threads in blocked state; CPU idle; p99 huge; one stack dominates dumps.",
        mitigate: "Never lock over I/O. Single-flight the fill without holding the map lock. Stripe or shard the structure.",
      },
      {
        name: "Unbounded mailbox",
        story: "A slow actor, a fast producer. Heap grows. GC makes the actor slower. Death spiral.",
        signal: "Mailbox depth, GC, then OOM. The actor is ‘busy’ forever.",
        mitigate: "Bounded mailboxes with load-shed. Backpressure to the producer. Time-budget the actor’s turn.",
      },
      {
        name: "False sharing",
        story: "Counters for 8 cores sit on one cache line. You scaled ‘linearly’ and got a round-robin cache ping-pong.",
        signal: "High coherence misses, throughput that falls as cores increase.",
        mitigate: "Pad/stripe counters. Prefer per-thread accumulation with periodic reduce.",
      },
    ],
    decisions: [
      {
        if: "The invariant is ‘one entity at a time’",
        then: "An actor or a per-key lock/queue, bounded.",
        why: "That is a serialized world. Pretending it is a thread pool just hides the queue.",
      },
      {
        if: "The work is independent",
        then: "A pool sized to the bottleneck resource, plus a semaphore bulkhead.",
        why: "Parallelism is a resource allocation problem, not a vibe.",
      },
      {
        if: "You are about to hold a lock across a network call",
        then: "Do not. Copy, release, I/O, CAS the result back.",
        why: "You just turned a remote timeout into a local deadlock of everyone else.",
      },
    ],
    related: ["resiliency", "consistency", "storage"],
  },
];

export const INCIDENTS: Incident[] = [
  {
    id: "double-sell",
    kicker: "Incident 01",
    title: "The last SKU sold twice",
    body: "Black Friday. Two regions, one stock row, a lock with a TTL. Both checkouts committed. The lock expired mid-pause; nobody fenced the writer. Caching served a stale 1 remaining.",
    domains: ["consistency", "caching", "cells"],
  },
  {
    id: "prefix-storm",
    kicker: "Incident 02",
    title: "A cache-key deploy became the outage",
    body: "The prefix changed. Hit rate collapsed. Every pod filled at once, retried without jitter, and autoscaling added more herders. Origin died of courtesy.",
    domains: ["caching", "resiliency", "config"],
  },
  {
    id: "noisy-neighbor",
    kicker: "Incident 03",
    title: "One tenant, everyone’s p95",
    body: "An enterprise export scanned the shared schema. RLS held. The buffer cache did not. A cell would have contained it; a hybrid tier would have graduated them last quarter.",
    domains: ["storage", "cells", "concurrency"],
  },
  {
    id: "ghost-session",
    kicker: "Incident 04",
    title: "Logout in one region, ghost in another",
    body: "SPA stored a refresh token. XSS was not even required — a laptop was. Revocation was eventually consistent across the ocean, and the JWT still verified.",
    domains: ["edge-auth", "cells", "consistency"],
  },
];

export function getDomain(slug: string): Domain | undefined {
  return DOMAINS.find((d) => d.slug === slug);
}

export function adjacent(slug: string): { prev?: Domain; next?: Domain } {
  const i = DOMAINS.findIndex((d) => d.slug === slug);
  if (i < 0) return {};
  return { prev: DOMAINS[i - 1], next: DOMAINS[i + 1] };
}

export type SearchHit = {
  kind: "domain" | "option" | "failure" | "incident";
  slug: string;
  title: string;
  blurb: string;
};

export function searchContent(q: string): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const d of DOMAINS) {
    if (
      d.title.toLowerCase().includes(needle) ||
      d.short.toLowerCase().includes(needle) ||
      d.dilemma.toLowerCase().includes(needle) ||
      d.thesis.toLowerCase().includes(needle)
    ) {
      hits.push({ kind: "domain", slug: d.slug, title: d.title, blurb: d.dilemma });
    }
    for (const o of d.options) {
      if (
        o.name.toLowerCase().includes(needle) ||
        o.promise.toLowerCase().includes(needle) ||
        o.cost.toLowerCase().includes(needle)
      ) {
        hits.push({
          kind: "option",
          slug: d.slug,
          title: o.name,
          blurb: `${d.short} — ${o.promise}`,
        });
      }
    }
    for (const f of d.failures) {
      if (f.name.toLowerCase().includes(needle) || f.story.toLowerCase().includes(needle)) {
        hits.push({
          kind: "failure",
          slug: d.slug,
          title: f.name,
          blurb: `${d.short} — ${f.story}`,
        });
      }
    }
  }
  for (const inc of INCIDENTS) {
    if (inc.title.toLowerCase().includes(needle) || inc.body.toLowerCase().includes(needle)) {
      hits.push({
        kind: "incident",
        slug: inc.domains[0] ?? "consistency",
        title: inc.title,
        blurb: inc.body,
      });
    }
  }
  return hits.slice(0, 12);
}
