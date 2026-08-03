---
sidebar_position: 1
title: Introduction
description: What Miabi is, who it's for, and how it works
---

# Introduction

**Miabi** is an open-source, self-hosted **Platform-as-a-Service (PaaS) for Docker** — your own
Heroku or Render, running on your own server. Push an app from a Git repository, a Docker image,
or a marketplace template, and Miabi handles the rest: build, deploy, domains, automatic SSL,
databases, scaling, backups, and monitoring. Everything happens from one web interface, in
minutes, **without touching a single Docker command or CLI**.

> **The name.** *Miabi* is Tshiluba (Kasai, DR Congo) for the **muabi trees** — traditionally
> associated with blessing and growth. Miabi joins the same family as its sibling projects
> [Goma Gateway](https://github.com/jkaninda/goma-gateway) and
> [Posta](https://github.com/goposta/posta).

## The gap it fills

Between a single `docker-compose.yml` and a full Kubernetes platform sits an awkward middle.
Compose has no rolling updates (restart a service and it is down until the new container is up), no
canary releases, no rollback, and no GitOps. Kubernetes has all of it — and asks for YAML, Helm, an
ingress controller, a service mesh just to split traffic, Argo CD or Flux for GitOps, and usually
someone whose job is keeping that running.

Miabi lives in that middle. It gives you the parts you actually wanted from Kubernetes —
zero-downtime rolling updates, canary releases, declarative reconciliation, multi-tenancy, quotas —
on plain Docker, on one VPS today and multiple nodes when you need them.

## Who it's for

- **Solo developers & homelabs** — one VPS, many side projects. Git-push deploys and automatic SSL,
  instead of hand-rolling an nginx config and a certbot renewal for each one.
- **Startups & small teams** — you outgrew Compose and don't want Kubernetes to become someone's
  full-time job. Separate staging and production workspaces, team access, managed databases, and
  deploys you can roll back.
- **Hosting providers & agencies** — many clients on shared infrastructure, every tenant isolated:
  apps, databases, networks, domains, secrets, users, and per-workspace quotas.

More broadly: anyone who wants the convenience of a managed platform without the recurring bill or
the vendor lock-in.

## Why Miabi

- **No CLI required.** Deploy, scale, and manage everything from the web console.
- **Ship safely without a service mesh.** Zero-downtime rolling updates and canary releases are
  built in — old containers keep serving until the new release is healthy, and traffic shifts to a
  new version gradually. No Istio, no Linkerd.
- **GitOps without a second platform.** Declare your stack in YAML and `miabi apply` reconciles it
  (dry-run, diff, prune), or push to Git to deploy — no Argo CD or Flux to install and operate.
- **API first.** Every feature is a documented REST + OpenAPI endpoint; the web console is just a
  consumer. Anything you can do in the UI, you can automate.
- **Multi-tenant from day one.** Workspaces own every resource — apps, databases, domains,
  certificates, volumes, backups, members — with RBAC and `workspace_id` scoping enforced end to
  end.
- **Self-hosted first.** A single binary serving the API and web UI runs happily on a VPS,
  dedicated box, homelab, or cloud VM. No external services required.
- **Docker-first, multi-node ready.** Single-node on plain Docker stays trivial; remote nodes join
  over an outbound agent tunnel, and an optional Docker Swarm cluster mode lights up overlay
  networking when you need it.
- **Secure by default.** Secrets are encrypted at rest with per-workspace keys, every mutation is
  audited, and 2FA, OAuth/OIDC, and RBAC are built in.
- **Open standards.** Docker, PostgreSQL, Redis, Let's Encrypt, S3/MinIO, GitHub/GitLab/Bitbucket.

## The north-star flow

Install on any Linux server → create a workspace → create an application → connect a domain →
deploy → receive automatic SSL → scale and manage. Everything in Miabi ladders up to this.

Miabi doesn't need a clean, dedicated box — it installs alongside your existing Docker workloads,
and you can [import containers you already run](/docs/nodes/docker-import) to manage them from the
console **without downtime**.

## Key features

| Area | What you get |
|------|--------------|
| **Applications & deployments** | Deploy from Git, image, or template; builds (incl. buildpacks), releases, one-click rollback, zero-downtime and canary updates, env vars, secret vault, resource limits, jobs, stacks, environments |
| **Domains, networking & TLS** | DNS-verified domains, routing via Goma Gateway, automatic HTTP-01 SSL, managed wildcard / DNS-01 certificates, uploaded custom certs, middlewares, port forwarding |
| **Databases** | Provision PostgreSQL, MySQL, MariaDB, Redis, MongoDB, and libSQL with managed credentials and in-place version upgrades |
| **Storage & backups** | Persistent volumes; scheduled and manual database and volume backups to local, MinIO, or S3; platform (control-plane) disaster-recovery backups |
| **Container registry** | Built-in, multi-tenant Docker registry namespaced per workspace, with local or S3/MinIO storage and image distribution across nodes |
| **Marketplace** | Versioned official templates — WordPress, Ghost, Nextcloud, n8n, Gitea, Umami, and more |
| **Multi-node & clustering** | Remote Docker hosts via an outbound agent tunnel; optional Docker Swarm cluster mode; housekeeping; Docker import |
| **CI/CD & GitOps** | Pipeline-as-code, dedicated [build runners](/docs/cicd/runners), declarative GitOps reconciliation, git-push deploy, signed webhooks and notifications |
| **Monitoring & operations** | Container CPU/memory/disk metrics with retained history, Prometheus client, externalized [log storage](/docs/operations/log-storage), append-only audit log |
| **Workspace analytics** | HTTP traffic, latency percentiles (p50/p95/p99), live visitors, and cookieless [web analytics](/docs/operations/analytics) per workspace and app — derived from the gateway, so there is nothing to instrument |
| **Identity & teams** | Auth with JWT sessions and revocation, API tokens, 2FA, OAuth/OIDC SSO, workspaces, organizations, RBAC, plans and quotas |
| **Security & compliance** | Secrets encrypted at rest with per-workspace keys, non-root container security profiles, SSRF-guarded webhooks; and on Enterprise, SAML/SCIM, custom roles, per-resource policies, and [SIEM streaming](/docs/security/siem) |
| **Automation** | REST + OpenAPI for everything, a [CLI](/docs/cicd/cli), and an official [Terraform / OpenTofu provider](https://github.com/miabi-io/terraform-provider-miabi) |

## How it fits together

```
Browser / CLI / API clients
        │
        ▼
Goma Gateway (routing, TLS/ACME) ─▶ Miabi (Go / Okapi) ─▶ Docker Engine (local + remote via agent)
                                          │  serves API + web UI (single binary)
                                          │  └─ asynq worker (deploys, provisioning, backups)
                                          └─ PostgreSQL (GORM) · Redis (cache / queue)
```

The Miabi control plane is a single Go binary that serves both the REST API and the embedded web
console. It talks to the local Docker Engine directly and to remote nodes through a lightweight
[agent](/docs/nodes/agent). [Goma Gateway](/docs/networking/routing-and-middlewares) sits in front,
handling routing and TLS. See [Architecture](/docs/concepts/architecture) for the full picture.

## API reference

This documentation is **guide-oriented** — it explains concepts and workflows. For endpoint-level
detail (every route, request body, and response), use the interactive API reference generated from
the code:

- **Interactive API reference (Scalar)** — available at `/docs` on your running Miabi instance (e.g.
  `https://your-domain/docs`). Turn it off with `MIABI_OPENAPI_DOCS=false`.
- **OpenAPI spec** — available at `/openapi.json` on your instance.

## Next steps

- [Installation](/docs/getting-started/installation) — deploy Miabi on a fresh host.
- [Configuration](/docs/getting-started/configuration) — environment variables and secrets.
- [Quick Start](/docs/getting-started/quickstart) — deploy your first application.
