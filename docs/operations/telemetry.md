---
sidebar_position: 8
title: Telemetry
description: The anonymous installation statistics Miabi shares with its maintainers, what they include, and how to turn them off.
---

# Telemetry

Miabi sends one small, **anonymous** event when it starts and once a day. It lets the project count
how many installations exist, how many are active, which versions they run and on what platform.
Nothing else.

Miabi works exactly the same with telemetry off: no feature depends on it, and an air-gapped or
firewalled install simply never sends anything.

## What is shared

Each event contains only:

- **An anonymous installation identifier.** It is derived from your Install ID with a one-way hash,
  so the same installation is counted once without the Install ID itself ever leaving your server.
- **The Miabi version** you are running.
- **The edition**: Community or Enterprise.
- **The platform**: plain Docker or Docker Swarm.
- **The operating system and CPU architecture**, for example Linux on amd64.

**Never shared:** your Install ID, hostnames, domains, IP addresses, email addresses, users,
workspaces, applications, databases, resource counts or licence details. The maintainers do not
store the IP address the event comes from.

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

The project keeps one record per installation (the information above, plus when it was first and last seen) and deletes it
after 24 months without an event.
