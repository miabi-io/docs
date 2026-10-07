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

:::info This page is about databases
Port forwarding is a short-lived connection to a managed database. To make an
**application** reachable — a generated URL, your own domain, or a published host port that
a platform admin approves — see [Exposing an Application](/docs/applications/exposing-your-app).
Admins review host port requests under **Security → Host ports**; see
[Workspace oversight](/docs/administration/workspace-oversight#moderating-host-ports).
:::

## How it works

From a database's detail page, choose **Connect externally**. Miabi opens a **temporary
listener on the control plane** and relays each connection to the database over the
node's tunnel — no host port is published on the database's node. The new forward appears
under **External forwards** with its `host:port` endpoint and when it expires. Connect with
the database's credentials — **Admin connection** reveals them; see
[Access & credentials](/docs/databases/access-and-credentials).

When you're done, **close** the forward, or let it expire — after 30 minutes by default
(`MIABI_FORWARD_TTL_MINUTES`). The listener is removed and the database returns to being
internal-only.

## Where the listener is reachable

The listener binds a random port on `MIABI_FORWARD_BIND_ADDR`, which defaults to `127.0.0.1`.
With the default it accepts only local connections to the control plane itself, so connecting
from another machine means setting a routable bind address. The endpoint shown is
`MIABI_FORWARD_ADVERTISE_HOST` when set, otherwise the bind address. See
[Configuration](/docs/getting-started/configuration).

On a routable bind address, a forward accepts connections only from the **IP address that
opened it**; any other client is refused.

## Why temporary instead of permanent

- **Smaller attack surface** — the database is exposed only while you're actively using
  it, not 24/7.
- **No config drift** — you don't leave a port open and forget about it.
- **Auditable** — each forward is an explicit, logged action tied to a workspace member.

:::caution
On a routable bind address, an open forward is a real port on the network. Connect over
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
