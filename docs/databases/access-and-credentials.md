---
sidebar_position: 3
title: Access & Credentials
description: How managed credentials work and how apps consume them.
---

# Access & Credentials

Every managed database comes with **managed credentials** that Miabi generates,
stores encrypted, and makes available to your apps. You rarely need to copy a password
by hand — apps consume the credentials automatically.

## Managed credentials

When a database is [provisioned](/docs/databases/provisioning), Miabi generates the
default user, a strong password, and a connection string, then stores them in the
workspace's **secret vault** — encrypted at rest and never logged in plaintext. See
[Encryption](/docs/security/encryption).

You can view the credentials in the database's detail view (with appropriate
permissions) and rotate the password when needed.

## How apps consume them

Attach a database to an [application](/docs/applications/overview), and Miabi injects the
connection details as **environment variables / secrets** at runtime. Typical injected
values include host, port, database name, username, password, and a full connection URL.

Because the values come from the secret vault as
[environment variables](/docs/applications/environment-variables), your app reads them
like any other config — and if you rotate the password, attached apps pick up the new
value on their next deploy.

:::tip
Reference the injected connection URL (for example `DATABASE_URL`) instead of hardcoding
credentials. Rotating the password then requires no code change.
:::

## libSQL token auth {#libsql-token-auth}

**libSQL** instances don't use a username/password. Instead, Miabi generates a per-instance
Ed25519 keypair at provision time and starts the `sqld` server with the public key; clients
authenticate with a **JWT auth token** minted from the private key (stored encrypted at rest,
like every other credential).

- **Endpoint** — clients connect over **HTTP** to the instance host on its libSQL port
  (`8080`) on the workspace's internal network; there is no separate wire protocol or CLI.
- **Auth** — pass the injected **auth token** as a bearer token. Use a libSQL/Turso client
  library (the token maps to the client's `authToken`).
- **One database** — the instance hosts a single database (named `default`); you don't create
  logical databases on it.

The token is injected into attached apps as a secret alongside the host and URL, exactly like
the other engines' passwords — so your app reads it from the environment and picks up a rotated
token on its next deploy.

## Connecting from your machine

Databases are **not exposed to the host by default** — they're only reachable on the
workspace's internal network. When you need to connect directly from your laptop (a
one-off migration, a manual query, an ad-hoc export), use
[port forwarding](/docs/networking/port-forwarding) to open a **temporary** external port,
then close it when you're done.

:::caution
Don't bake database credentials into images, commit them to Git, or paste them into chat.
Let Miabi inject them as secrets so they stay encrypted and rotatable.
:::

:::note
Viewing database credentials is limited to **Owners and Admins**. Developers can create and operate
databases but cannot reveal secret values; Viewers cannot either.
:::
