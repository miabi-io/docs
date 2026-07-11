---
sidebar_position: 1
title: Pipelines
description: Pipeline-as-code CI/CD in Miabi — build, test, scan, and deploy a commit on a runner.
---

# Pipelines

**Pipelines** bring pipeline-as-code CI/CD to Miabi. You describe the ordered steps that turn a **specific commit** into an image and a release — test, build, scan, deploy — and Miabi runs them on a [build runner](/docs/cicd/runners), streaming logs and per-step status to the console.

![Pipeline runs](/img/screenshots/pipelines.png)

## The spec

A pipeline is a declarative `kind: Pipeline` document. Keep it in your repo at **`.miabi/pipeline.yaml`** (versioned with the code) and register it from **Workspace → Pipelines → New**:

```yaml
apiVersion: miabi.io/v1
kind: Pipeline
metadata: { name: web }
on:
  push: { branches: [main] }   # a push to main fires a run, pinned to that commit
  manual: true                 # also runnable from the UI / API
  schedule: "0 3 * * *"        # optional cron (runs the app's branch HEAD)
steps:
  - name: test
    image: node:20
    run: "npm ci && npm test"
  - name: build
    uses: build                # builds the checked-out source, pushes it, captures the digest
    dockerfile: Dockerfile
  - name: scan
    image: aquasec/trivy:latest
    continue-on-error: true    # report vulnerabilities without blocking the deploy
    run: "trivy image --exit-code 1 --severity HIGH,CRITICAL $MIABI_IMAGE"
  - name: deploy
    uses: deploy               # deploys the built image by digest
```

:::note Bind it to a Git-backed app
A pipeline is attached to an application whose source is a Git repo. The runner clones that repo once at the run's commit into a shared workspace (`/workspace`), then runs each step over it. The stored spec is what executes — the `.miabi/pipeline.yaml` file is your version-controlled source of truth, not auto-read (re-apply after editing).
:::

## Steps

Each step is either a **container step** (`image` + `run`) or a **built-in** (`uses:`).

### Container steps — `image` + `run`

`run:` is a shell command executed in a **non-login shell inside the step image** — the same model as a GitHub Actions `run:` step, so pipes, `&&`, and environment expansion all work. It overrides the image's entrypoint, so images that ship their own entrypoint (e.g. `aquasec/trivy`) still run your script — write the full command, including the tool name.

```yaml
  - name: lint
    image: golangci/golangci-lint:latest
    run: "golangci-lint run ./..."
```

### `uses: build`

Turns the checked-out workspace into an image — a **Dockerfile** build (`dockerfile:` sets the path, default `Dockerfile`) or **Cloud Native Buildpacks** when no Dockerfile is present — pushes it to the [built-in registry](/docs/registry/overview), captures the digest, and records an [Image](/docs/registry/overview) with build provenance (which runner produced it).

### `uses: deploy`

Deploys the image the `build` step produced, **by digest** — no rebuild, no registry round-trip on the node. It targets the pipeline's bound app by default; `app: <name-or-id>` overrides the target. This produces a normal Miabi [deployment](/docs/applications/overview), so releases, health checks, and **rollback** all apply.

## Triggers

`on:` decides how a run starts — a run is always pinned to a specific commit:

- **`push`** — a native webhook fires a run for the pushed commit (branch-filtered). See [Git push deploy](/docs/cicd/git-push-deploy).
- **`manual`** — the **Run now** button or `POST …/trigger` (HEAD of the app's ref, or a commit you pass).
- **`schedule`** — a cron entry that runs the bound app's branch HEAD.

A `git push` can also start a run three ways (native webhook, CI calling the trigger API, or schedule) — full setup is in the [pipeline example](https://github.com/miabi-io/miabi/tree/main/examples/pipeline).

## Environment & step outputs

The runner exports run context to every step as environment variables:

| Variable | Meaning |
|----------|---------|
| `MIABI_IMAGE` | Image ref the `build` step produced (`repo:tag`) — set for steps **after** build |
| `MIABI_IMAGE_DIGEST` | Immutable `repo@sha256:…` form of the same image |
| `MIABI_COMMIT` | Resolved commit the workspace was checked out at |
| `MIABI_RUN_NUMBER` | Per-pipeline run counter |
| `MIABI_WORKDIR` | The shared workspace path inside steps (`/workspace`) |
| `MIABI_REGISTRY` / `MIABI_REGISTRY_USER` / `MIABI_REGISTRY_TOKEN` | Registry host + per-job credentials (e.g. for a scanner to pull `$MIABI_IMAGE`) |

### Exporting values between steps — `$MIABI_ENV`

Any step can hand values to later steps by appending `KEY=VALUE` to **`$MIABI_ENV`** — the same contract as GitHub Actions' `$GITHUB_ENV`:

```yaml
  - name: version
    image: alpine
    run: "echo VERSION=$(cat VERSION) >> $MIABI_ENV"
  - name: tag
    image: alpine
    run: "echo building $VERSION"   # later steps see it
```

`MIABI_IMAGE` is published through this same channel by the `build` step.

## continue-on-error

By default any step that fails aborts the run. Set **`continue-on-error: true`** to let the run keep going and still succeed when that step fails (the step is still recorded **failed**) — for report-only stages like a vulnerability scan:

```yaml
  - name: scan
    image: aquasec/trivy:latest
    continue-on-error: true
    run: "trivy image --exit-code 1 --severity HIGH,CRITICAL $MIABI_IMAGE"
```

In the run view the step shows a red **failed** state with a `continue-on-error` marker and a "failure ignored" note, while the run itself is green — the same semantics as GitHub Actions.

## Running & observing a run

Runs execute on a registered [runner](/docs/cicd/runners) (a co-located built-in one ships for single-node/homelab). The run view shows a **live stepper** — each step transitions running → succeeded/failed in real time over SSE — with **streaming logs** you can filter per step, plus the **built image** (repository, digest, commit, size, runner). Every run records its resolved commit and produced image, and the history is retained for audit.

## Relation to deployments

A pipeline's `deploy` step produces a **deployment** — the same release object you see everywhere in Miabi, so deployment history, health checks, and **rollback** all apply. Pipelines orchestrate *how* a release is produced; deployments are *what* gets produced. For the simplest path without build/test gates, a plain [Git push deploy](/docs/cicd/git-push-deploy) may be all you need.

## Related

- [Build runners](/docs/cicd/runners)
- [Container registry](/docs/registry/overview)
- [GitOps](/docs/cicd/gitops)
- [Git push deploy](/docs/cicd/git-push-deploy)
- [Webhooks & notifications](/docs/cicd/webhooks-and-notifications)
