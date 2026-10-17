---
sidebar_position: 5
title: Installing on an existing server
description: Install Miabi on a host that already runs containers and a reverse proxy, then bring those apps under Miabi.
---

# Installing on an existing server

Miabi does not need a fresh host. If your server already runs containers behind a reverse proxy —
nginx, Traefik, Caddy, or nginx-proxy — you can install Miabi beside them and move the apps over
without rebuilding them.

The only thing the two cannot share is ports **80** and **443**. Miabi's gateway needs both, so the
old proxy has to step aside. Your apps go offline from the moment you stop it until their routes are
live on Miabi, so plan a short maintenance window.

## 1. Find what holds ports 80 and 443

```bash
docker ps --filter publish=80 --filter publish=443
sudo ss -ltnp '( sport = :80 or sport = :443 )'
```

The first command lists containers that publish the ports; the second also catches a proxy
installed on the host itself. You don't have to get this right up front: `miabi setup` checks both
ports before it creates anything, and stops with the name of whatever holds them.

## 2. Stop the old proxy

Stop it, but **don't remove it** — keeping it is your way back.

A proxy running in a container:

```bash
docker stop nginx-proxy
docker update --restart=no nginx-proxy   # keep it from coming back on reboot
```

A proxy running on the host:

```bash
sudo systemctl disable --now nginx
```

If the proxy is part of a Compose project, stop that one service with
`docker compose stop <service>` instead of `docker compose down`, which would also stop your apps.

## 3. Run the installer

```bash
curl -fsSL https://get.miabi.io | sudo MIABI_DOMAIN=miabi.example.com \
  MIABI_ADMIN_EMAIL=you@example.com bash
```

This is the same [one-line install](/docs/getting-started/installation#one-line-install-recommended)
as on a fresh host. Miabi creates its own networks, volumes and containers, and leaves your
existing containers untouched.

:::warning Subnet overlap
Miabi uses `10.62.0.0/16` and `10.63.0.0/16` for its own networks and carves workspace networks
from `10.64.0.0/12`. If your existing Docker networks or VPN use those ranges, pick others with
`MIABI_INTERNAL_SUBNET` and `MIABI_SUBNET` — see [Install options](/docs/getting-started/installation#install-options)
and [Networks & Subnets](/docs/networking/networks-and-subnets).
:::

## 4. Import your containers

Log in, open the node and choose **Import existing**. Select the containers, volumes and networks
to adopt, keep the default **Adopt in place** mode, and confirm. Your containers keep running,
with no restart. Each Compose project becomes a [stack](/docs/applications/stacks).

Leave the old proxy out of the import: Miabi's gateway replaces it.

See [Docker import](/docs/nodes/docker-import) for the details, including the secrets flagged in
environment variables.

## 5. Create routes

For each imported app, declare its container port, then add a route for its domain —
[Exposing an application](/docs/applications/exposing-your-app#method-2--your-own-domain) walks
through it, and [Migrating from Traefik, Caddy and nginx](/docs/routes/migrating) translates your
old proxy configuration. Your DNS already points at this server, so the gateway can request certificates as soon
as each route exists.

Do the apps that matter most first: each one is back online as soon as its route and certificate are
live.

Once every app answers through Miabi, check the imported apps for host ports they still publish
only for the old proxy. They are no longer needed, and dropping them keeps the apps off the public
interface.

## Rolling back

If something goes wrong before the migration is complete, stop Miabi's gateway and bring the old
proxy back:

```bash
docker stop miabi-gateway
docker update --restart=unless-stopped nginx-proxy && docker start nginx-proxy
```

Your apps were adopted in place, so they are still the same containers the old proxy was routing
to. When you are done with the old proxy for good, remove it.
