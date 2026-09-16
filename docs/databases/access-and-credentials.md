---
sidebar_position: 3
title: Access & Credentials
description: How managed credentials work and how apps consume them.
---

# Access & Credentials

Every managed database comes with **managed credentials** that Miabi generates,
stores encrypted, and makes available to your apps. You rarely need to copy a password
by hand — apps consume the credentials automatically.

![A database's connection details and credentials](/img/screenshots/database-credentials.png)

## Managed credentials

When a database is [provisioned](/docs/databases/provisioning), Miabi generates the
default user, a strong password, and a connection string, then stores them in the
workspace's **secret vault** — encrypted at rest and never logged in plaintext. See
[Encryption](/docs/security/encryption).

Workspace admins can reveal the connection details in the database's detail view. Miabi does not
rotate a managed database's password; the generated credentials stay the same for the life of the
database, including across [version upgrades](/docs/databases/version-upgrades).

## How apps consume them

Attach a database to an [application](/docs/applications/overview), and Miabi injects the
connection details as **environment variables** backed by the secret vault:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The full connection URL, as a reference to its managed secret |
| `DB_HOST` / `DB_PORT` | The in-network host and port |
| `DB_NAME` | The logical database |
| `DB_USER` | The database's own scoped user |
| `DB_PASSWORD` | That user's password, as a reference to its managed secret |

The password and URL are injected as `${{ secrets.… }}` references to the database's
[managed secrets](/docs/secrets/overview#managed-secrets), so the plaintext never sits in the app's
settings. An optional **env prefix**, set when you link the database from the app, namespaces the
variables so one app can use several databases: prefix `ANALYTICS` gives `ANALYTICS_DATABASE_URL`,
`ANALYTICS_DB_HOST`, and so on. Your app reads them like any other
[environment variables](/docs/applications/environment-variables); a newly linked database takes
effect on the app's next deploy.

:::tip
Reference the injected connection URL (for example `DATABASE_URL`) instead of hardcoding
credentials, so moving the app to another database needs no code change.
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
the other engines' passwords, so your app reads it from the environment.

## Connecting from your machine

Databases are **not exposed to the host by default** — they're only reachable on the
workspace's internal network. When you need to connect directly from your laptop (a
one-off migration, a manual query, an ad-hoc export), use
[port forwarding](/docs/networking/port-forwarding) to open a **temporary** listener on the
control plane, then close it when you're done. It binds to `127.0.0.1` by default, so reaching it
from another machine needs `MIABI_FORWARD_BIND_ADDR` set to a routable address.

:::caution
Don't bake database credentials into images, commit them to Git, or paste them into chat.
Let Miabi inject them as secrets so they stay encrypted at rest.
:::

:::note
Viewing database credentials is limited to **Owners and Admins**. Developers can create and operate
databases but cannot reveal secret values; Viewers cannot either.
:::
