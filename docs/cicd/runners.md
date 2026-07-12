---
sidebar_position: 3
title: Build Runners
description: Dedicated build machines that keep build and pipeline load off your app-hosting nodes.
---

# Build Runners

**Runners** are machines dedicated to build and pipeline work. When a [pipeline](/docs/cicd/pipelines) builds an image or runs a step, that work executes on a runner — never on the nodes that host your apps and databases. A node's only job is to *pull and run* the finished image; it never builds it.

This separation matters because a build spike (CPU, memory, disk, image layers, build cache) is exactly the kind of load you don't want competing with the production workloads a node is keeping up. Moving builds onto runners keeps hosting nodes calm and predictable, and keeps untrusted build inputs away from a production Docker daemon.

## How builds reach a runner

A runner builds an image and **pushes it to a registry by digest**; a deploy then **pulls that digest** onto the target node. The runner and the node never share a Docker daemon. This is what makes "build off-node" clean: once the artifact lives in a registry, *who* built it is decoupled from *where* it runs.

When a workspace has a usable runner registered, its git-app deploys and pipeline runs are dispatched to that runner automatically — you don't wire anything up per run. The scheduler picks an eligible runner, leases it, streams the job to it over the runner's tunnel, and rolls the resulting image out to the target node as a plain deploy-by-digest.

## The built-in runner

Every build runs on a **registered runner** — there is no in-process or on-node fallback. A fresh
install therefore needs at least one runner before a Git-source app can deploy. Register one from
**Settings → Runners**.

Runners execute the `miabi/runner` image; override it with `MIABI_RUNNER_IMAGE` (the installer pins
`RUNNER_IMAGE` in `.env`). `miabi/runner` versions independently of the panel, so its tag does not
track the Miabi version.

:::caution
There is no `MIABI_BUILTIN_RUNNER_ENABLED` setting. A co-located "built-in runner" is not wired up
by any environment variable today.
:::

The built-in runner is **off by default**. That is deliberate: on a multi-node install a fresh instance has *no* runner, so builds queue until you add one rather than silently falling back to a hosting node.

## Registering a dedicated runner

For anything beyond a homelab, register a dedicated build machine:

1. In the console, open **Settings → Runners → Add runner**. Give it a name, optional [labels](#labels-and-targeting), and a concurrency (how many jobs it may run at once).
2. Miabi returns a **one-time registration token**, shown once and stored only as a hash — the same handling as a node [join token](/docs/nodes/adding-a-node). Copy it before you leave the page; you can regenerate it later, which invalidates the old one.
3. On the build machine, run the `miabi-runner` binary (or container) with the token and your control-plane URL. Like the [node agent](/docs/nodes/agent), it dials **outbound** to the runner gateway — the machine needs no inbound ports open — authenticates, and appears **online** in the console.

A new runner starts **offline** and flips to **online** once its tunnel is live; it reports its OS, architecture, and version on connect. From the runner's page you can edit its labels and concurrency, **cordon** it (hold it out of scheduling without disconnecting it), disable it, or remove it.

:::note
How many runners a workspace may register is a plan limit. If you hit it, raise the workspace's quota or remove an idle runner.
:::

## Labels and targeting

Runners carry free-form **labels** — for example `arch=amd64`, `buildkit`, or `gpu`. A job can declare required labels, and the scheduler only considers runners whose label set contains all of them. Among the eligible runners it picks the **least-loaded** one (fewest active leases, up to each runner's declared concurrency). A job with no required labels matches any in-scope runner.

Use labels when a build genuinely needs a particular machine — a specific CPU architecture, a GPU, or a build toolchain — and leave them off when any runner will do.

## Builds never touch a hosting node

Builds **always** run on a registered runner. This is unconditional — not a setting you can turn off,
and there is no `MIABI_BUILDS_REQUIRE_RUNNER` variable.

If no eligible runner can take a build, the run **waits** in a "waiting for a runner" state, bounded
by `MIABI_RUNNER_WAIT_TIMEOUT_MINUTES` (default `30`). When that elapses the deployment **fails**
with `no runner became available — register a runner`.

:::caution
Miabi does **not** fall back to building locally when a workspace has no runner. Register a runner
before deploying a Git-source app, or the deploy will wait and then fail.
:::

## Live logs

A runner streams its output — step transitions, log lines, and the final status — back to the control plane as the job runs. That stream feeds the same live view as any other [pipeline](/docs/cicd/pipelines) run, so you watch a runner build exactly where you'd watch any deploy: in the run's log view, in real time, with full history retained afterward. The image a runner builds is stamped with provenance (which runner produced it), visible on the resulting deployment.

## Security and least privilege

Runners are built to be safe to run as shared, multi-tenant build infrastructure:

- **Outbound only, scoped token.** A runner connects outbound over an encrypted tunnel with a registration token whose scope is distinct from a node's join token. It can register, heartbeat, lease jobs, and stream logs — it cannot reach the panel API, another workspace's data, or a hosting node's Docker.
- **No logs stored on the runner.** Output is streamed to the control plane, not written to disk on the build machine.
- **Per-job credentials, minted on lease.** Each job is handed short-lived credentials scoped to just its own work: a registry login limited to this app's repository, and — when `MIABI_JOB_API_TOKEN_ENABLED=true` (the default) — a callback token (`MIABI_JOB_TOKEN`) scoped to deploy only this app and run. Both are ephemeral, expire at the job deadline, and are **revoked the moment the run finishes**. A hardened install can set `MIABI_JOB_API_TOKEN_ENABLED=false` to withhold the callback token while still injecting the registry credential.
- **Secrets masked in logs.** Every injected credential value is redacted from the live log stream, so a step that echoes one prints `••••`.
- **Per-job isolation.** On a shared runner each job runs with only its own context — nothing from another workspace's job is visible.

The upshot: a pipeline step can build and push with **zero configured credentials**, and a leaked value is useless minutes later and can only touch that one app's repository.

## Managing shared runners

Administrators can register **platform-shared** runners under **Admin → Runners** — runners with no owning workspace that any eligible workspace's jobs can use. Admins manage the shared pool (create, edit, cordon, remove); workspace members can *use* a shared runner but not edit it.

The platform-shared runner pool is **unlimited** — register as many as you need. **Workspace-owned runners are always unlimited** too. A workspace's access to the shared pool is governed by its plan's *platform runners* capability.

## Related

- [Pipelines](/docs/cicd/pipelines)
- [Git push deploy](/docs/cicd/git-push-deploy)
- [Node Agent](/docs/nodes/agent)
