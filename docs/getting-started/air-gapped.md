---
sidebar_position: 5
title: Air-gapped installs
description: Every outbound connection Miabi makes on its own, and how to turn each one off for an air-gapped or egress-restricted install.
---

# Air-gapped installs

Miabi runs without internet access. Nothing it needs to deploy apps, serve traffic or validate a
licence depends on a connection to the Miabi project. A few features reach out by default; this page
lists each one and the setting that turns it off.

## Connections Miabi makes on its own

| Destination | Purpose | How to turn it off |
|---|---|---|
| `https://versions.miabi.io` | Daily [update check](/docs/upgrades/overview#update-notifications) for Miabi, the node agent, the runner and the gateway | `MIABI_UPDATE_CHECK=false` |
| `https://miabi.io` | Anonymous [installation statistics](/docs/operations/telemetry) | `MIABI_TELEMETRY=false` or `DO_NOT_TRACK=1` |
| `https://marketplace.miabi.io` | [Marketplace](/docs/marketplace/overview) template catalog sync | `MIABI_MARKETPLACE_URL=` (set, but empty) |
| Docker Hub and other registries | Pulling platform, database and application images | A [registry mirror](/docs/administration/scheduled-jobs#image-defaults), or images pre-loaded on each host |
| Let's Encrypt | Automatic [TLS certificates](/docs/networking/tls-certificates) | An internal ACME issuer in the gateway config, or uploaded certificates |
| Public DNS | [Domain verification](/docs/administration/workspace-oversight#moderating-domains) | **Force verify** the domain as a platform admin |

Each of these fails quietly when it can't connect: the update check records the error for admins,
telemetry drops the event, and the marketplace keeps the templates built into the image. Turning
them off avoids the attempts and their log lines.

**Licence validation is offline.** An Enterprise licence is verified locally against a key built into
Miabi, so it needs no connection.

## Installing without internet access

The installer downloads a few things. On a disconnected host, provide each one yourself:

| Download | Default source | Offline alternative |
|---|---|---|
| The install script | `https://get.miabi.io` | Download it on a connected machine and copy it over |
| The `miabi` CLI | GitHub releases | `MIABI_CLI_BASE_URL` pointing at an internal artifact store |
| The latest Miabi version, for `miabi setup`/`upgrade` run without `--version` | `https://versions.miabi.io` | Pass `--version`, or set `MIABI_RELEASE_API` to a mirror |
| The versions the install script installs | `https://versions.miabi.io` | Set `MIABI_VERSION`, `GOMA_VERSION`, `RUNNER_VERSION` and `MIABI_CLI_VERSION`; with all four set the script looks nothing up |
| Docker Engine | The Docker package repositories | Install Docker yourself and set `MIABI_SKIP_DOCKER_INSTALL=1` |
| Container images | Docker Hub | Load them with `docker load`, or pull through an internal registry |

A fresh install needs `miabi/miabi` and `jkaninda/goma-gateway` at the versions you set above (each
Miabi release lists its tested gateway and runner on `versions.miabi.io`), plus `postgres:17-alpine`
and `redis:7-alpine`. Remote nodes and CI runners also
need `miabi/agent` and `miabi/runner`.

See [Installation](/docs/getting-started/installation#install-options) for every installer option.

## Connections you configure

These connect only when you set them up, and only to the address you give:

- Git providers for [pipelines](/docs/cicd/pipelines) and Git-sourced apps
- [SSO](/docs/security/sso) identity providers
- [DNS providers](/docs/networking/dns-providers) for DNS-01 certificates
- S3-compatible storage for [backups](/docs/storage/backups)
- [Webhooks](/docs/cicd/webhooks-and-notifications) and [alert](/docs/operations/alerts) notification channels
- An SMTP server for email
- [SIEM](/docs/security/siem) audit-log sinks

Point each at an internal service, or leave it unconfigured.
