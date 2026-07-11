---
sidebar_position: 6
title: SIEM & Compliance
description: Stream every audit event to an external SIEM or log pipeline, at-least-once, over syslog or webhook.
---

# SIEM & Compliance

SIEM streaming ships every [audit event](/docs/operations/audit-log) to an external
security-information-and-event-management (SIEM) system or log pipeline as it happens. Where the
built-in audit log lives inside Miabi and is queried per workspace, streaming pushes those same
events *out* — to a central place where they can be retained, correlated, alerted on, and kept
alongside logs from the rest of your infrastructure.

:::info Enterprise feature
SIEM streaming is part of the **Enterprise** edition and stays locked until it is unlocked by a
signed license key. In the Community edition the streamer is dormant and the admin SIEM endpoints
return **HTTP 402**. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) and
[Licensing](/docs/editions/licensing).
:::

## Why stream to a SIEM

The [audit log](/docs/operations/audit-log) already gives you an append-only, per-workspace record
of every mutating action. Streaming it to a SIEM adds what a compliance program typically needs on
top of that:

- **Central aggregation** — Miabi's audit trail sits next to your host, network, and application
  logs in one queryable place instead of only inside the panel.
- **Long-term retention** — your SIEM, not Miabi, owns retention. Events survive independently of
  the local audit table (which may be pruned by a retention policy).
- **Detection and alerting** — feed administrative actions into the same correlation and alerting
  rules you already run for the rest of your estate.
- **Compliance evidence** — frameworks such as SOC 2 and ISO 27001 expect a tamper-evident, exported
  record of administrative activity; a live stream to an immutable sink satisfies that.

The in-app audit log is unchanged and remains available in every edition; streaming is purely
additive.

## How events flow

Streaming is built for durability, not fire-and-forget. Instead of relying on live events (which
can be dropped on a restart or a slow consumer), the streamer reads directly from the durable audit
table using a **cursor** — the highest audit-log id it has confirmed shipped to each target.

On a schedule (a background job that runs roughly every 30 seconds, entirely off the request path),
the streamer:

1. Reads new audit rows with an id greater than the target's cursor, in batches.
2. Ships the batch to the sink.
3. **Advances the cursor only after a successful ship.**

If the sink is unreachable, the cursor does not advance: the events remain in the audit table and
are retried on the next tick. This gives **at-least-once** delivery — a SIEM outage or a Miabi
restart never drops events; when the sink recovers, the backlog is delivered in order.

:::note At-least-once, not exactly-once
Because the cursor only advances after a confirmed ship, a crash between shipping a batch and
recording the cursor can cause that batch to be **re-sent**. Every event carries its stable audit-log
`id`, so your SIEM can de-duplicate on it. Design your ingestion to tolerate duplicates.
:::

Each target tracks its own cursor, so a failing sink never affects another, and shipping never blocks
or slows a user action — a dead sink can never fail a deployment.

## Configuring a stream

Streaming targets are managed in the admin console under **Administration → SIEM**. Each target has:

| Field | Description |
|-------|-------------|
| **Name** | A label for the target. |
| **Sink** | The delivery mechanism — `syslog` or `webhook`. |
| **Endpoint** | Where events are sent (see per-sink notes below). |
| **Format** | `json` (NDJSON) or `cef`. |
| **Auth header** | For webhooks, an `Authorization` header value — [encrypted at rest](/docs/security/encryption) and never returned by the API. |
| **Enabled** | Whether the streamer ships to this target. |

You can create multiple targets and enable or disable each independently. After configuring a target,
use the **Test** button to ship a single synthetic event and verify connectivity — any sink error
(for example a bad endpoint) is surfaced back to you and recorded as the target's last error.

Changes to SIEM targets are themselves audited, and the auth header is stored
[encrypted](/docs/security/encryption) and never serialized back out.

### Sinks

**Webhook** — Miabi `POST`s a batch as NDJSON (`Content-Type: application/x-ndjson`), one JSON event
per line. A `2xx` response is treated as success; anything else fails the batch and triggers a retry.
If an auth header is configured, it is sent as the `Authorization` request header. Use this for
HTTP-based collectors and log-ingestion endpoints.

**Syslog** — Miabi sends one RFC 5424 message per event over TCP or UDP. The endpoint takes the form
`tcp://host:514`, `udp://host:514`, or `host:514` (defaulting to UDP). With the `json` format the
message body is the JSON event; with the `cef` format each event is emitted as a CEF record, suited
to SIEMs that parse the Common Event Format.

### Event payload

Each streamed event carries the audit fields your SIEM needs to attribute and correlate an action:

- `id` — the stable audit-log id (use it to de-duplicate)
- `timestamp` — RFC 3339, UTC
- `actor_id` — the member who performed the action
- `workspace_id`
- `action`
- `target_type` and `target_id`
- `ip`
- `metadata`

## Relation to the audit log

SIEM streaming does not replace the [audit log](/docs/operations/audit-log) — it reads from it. The
audit log stays the local source of truth (append-only, queryable per workspace); the stream is a
durable copy pushed to an external system. If you don't have a SIEM but still need exported records,
the audit log can also be exported directly (see the audit and export controls in the admin console).

## Learn more

The exact REST endpoints for managing SIEM targets are documented in the generated API reference,
available at `/docs` on a running instance.
