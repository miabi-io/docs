---
sidebar_position: 5
title: Port Forwarding
description: On-demand, temporary external access to a managed database.
---

# Port Forwarding

By default, managed [databases](/docs/databases/overview) are **not** reachable from
outside the node — they're only available to apps on the internal network. When you
occasionally need to connect from your laptop (to run a migration, inspect data, or take
an ad-hoc dump), use **port forwarding** instead of permanently exposing the database.

![Port forwarding](/img/screenshots/port-forwarding.png)

## How it works

From a database's detail page, choose **Forward port**. Miabi opens a **temporary
external port** that maps to the database's internal port for the duration of your
session. You get a host, port, and the managed credentials needed to connect — see
[Access & credentials](/docs/databases/access-and-credentials).

When you're done, **close** the forward (or let it expire). The external port is removed
and the database returns to being internal-only.

## Why temporary instead of permanent

- **Smaller attack surface** — the database is exposed only while you're actively using
  it, not 24/7.
- **No config drift** — you don't leave a port open and forget about it.
- **Auditable** — each forward is an explicit, logged action tied to a workspace member.

:::caution
A forwarded port is still a real, internet-reachable port while it's open. Connect over
TLS where the engine supports it, use the managed credentials, and close the forward as
soon as you finish.
:::

:::tip
For an application that needs ongoing access to a database, don't use port forwarding —
attach the database to the app so it connects over the internal network using injected
[environment variables](/docs/applications/environment-variables).
:::

:::note
Opening, listing, and closing a forward all require **Admin or Owner**. Developers and Viewers
cannot open a forward or even see that one exists.
:::
