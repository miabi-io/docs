---
sidebar_position: 8
title: Telemetry
description: The anonymous startup and daily event Miabi sends to count installations, exactly what it contains, and how to turn it off.
---

# Telemetry

Miabi sends one small, **anonymous** event when it starts and once a day. It lets the project count
how many installations exist, how many are active, which versions they run and on what platform.
Nothing else.

Miabi works exactly the same with telemetry off: no feature depends on it, and an air-gapped or
firewalled install simply never sends anything.

## What is sent

`POST https://miabi.io/api/v1/telemetry/installations`

```json
{
  "schema": 1,
  "installation_id": "9f2c…(64 hex characters)",
  "event": "startup",
  "version": "1.8.0",
  "edition": "community",
  "platform": "swarm",
  "os": "linux",
  "arch": "amd64"
}
```

| Field | Meaning |
|---|---|
| `installation_id` | A SHA-256 hash of the Install ID. Stable, so an installation is counted once, but it is not the Install ID itself |
| `event` | `startup` or `daily` |
| `version` | The Miabi release |
| `edition` | `community` or `enterprise` |
| `platform` | `standalone` (plain Docker) or `swarm` |
| `os`, `arch` | e.g. `linux`, `amd64` |

**Never sent:** the Install ID, hostnames, domains, IP addresses, emails, users, workspaces, apps,
databases, resource counts or licence details. The receiver does not store the sender's IP address.

To see the exact event your installation sends, open **Admin → Settings → Anonymous telemetry →
Show what is sent**.

## When it is sent

- **At startup**, 1–5 minutes after boot, at most once per version per hour (a crash-looping or
  multi-replica control plane does not send repeatedly).
- **Daily** at 04:51, so a server that runs for months without a restart still counts as active.

Development builds never send. Failures are silent and never retried; the next scheduled event
covers them.

## Turning it off

Telemetry is configured from the environment only.

| Variable | Effect |
|---|---|
| `MIABI_TELEMETRY=false` | Turns telemetry off |
| `DO_NOT_TRACK=1` | Turns telemetry off (the cross-tool convention) |

On a stack installed with get.miabi.io, add `MIABI_TELEMETRY: "false"` under `env:` in the manifest
and re-apply it. With Docker Compose, set `MIABI_TELEMETRY=false` in `.env`.

The change applies on the next restart.

## Retention

The project keeps one row per installation (the fields above plus first and last seen) and deletes it
after 24 months without an event.
