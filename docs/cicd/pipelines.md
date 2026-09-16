---
sidebar_position: 1
title: Pipelines
description: Pipeline-as-code CI/CD in Miabi — build, test, scan, and deploy a commit on a runner.
---

# Pipelines

**Pipelines** bring pipeline-as-code CI/CD to Miabi. You describe the ordered steps that turn a **specific commit** into an image and a release — test, build, scan, deploy — and Miabi runs them on a [build runner](/docs/cicd/runners), streaming logs and per-step status to the console.

![Pipeline runs](/img/screenshots/pipelines.png)

## The spec

A pipeline is a declarative `kind: Pipeline` document. Keep it in your repo at **`.miabi/pipeline.yaml`** (versioned with the code), or create one from **GitOps & CI/CD → Pipelines → New pipeline**:

```yaml
apiVersion: miabi.io/v1
kind: Pipeline
metadata: { name: web }
on:
  push: { branches: [main] }   # a push to main fires a run, pinned to that commit
  manual: true                 # also runnable from the UI / API
  schedule: "0 3 * * *"        # optional cron (runs the app's branch HEAD)
env:                           # optional; applied to every step
  NODE_ENV: production
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}   # resolved from the workspace vault
steps:
  - name: test
    image: node:20
    env: { CI: "true" }        # optional; adds to the pipeline's env
    run: "npm ci && npm test"
  - name: build
    uses: build                # builds the checked-out source, pushes it, captures the digest
    dockerfile: docker/Dockerfile   # optional; default "Dockerfile"
  - name: scan
    image: aquasec/trivy:latest
    continue-on-error: true    # report vulnerabilities without blocking the deploy
    run: "trivy image --exit-code 1 --severity HIGH,CRITICAL $MIABI_IMAGE"
  - name: deploy
    uses: deploy               # deploys the built image by digest
```

## Pipelines from your repository

A pipeline comes from one of two places:

| | Defined in | Edited |
|---|---|---|
| **Repository pipeline** | `.miabi/pipeline.yaml` in the app's repository (also `.yml`, or `pipelines.yaml`) | In Git — Miabi re-reads the file before each run |
| **Console pipeline** | The spec you save in the console or API | In the console or API |

When you create a Git-source app from a repository that carries a pipeline file, Miabi offers to **adopt**
it. The adopted pipeline is bound to the app, and from then on **deploying the app runs the pipeline**
instead of building directly. Miabi re-reads the file from the repository before every run, so a change
you push takes effect on the next run.

Because Git owns it, a repository pipeline's spec, name, and binding cannot be edited in Miabi — change the
file instead. It can still be **disabled**, which is the switch to reach for when a commit breaks it.

:::note
Adopting a repository pipeline lets whoever can push to the repository choose the images and commands a
runner executes. A platform admin can turn adoption off for the whole install with **Allow pipelines from
`.miabi/pipeline.yaml`** in [platform settings](/docs/operations/platform-settings); Git apps then always build
directly.
:::

## What a pipeline builds

A pipeline is bound to **one source**, chosen when you create it. The binding decides what the runner
checks out into the shared `/workspace` before the first step, and where a `uses: build` step pushes.

| Bound to | Checks out | Pushes to | `uses: deploy` |
|---|---|---|---|
| An **application** | the app's Git repository, at the run's commit | `ws_<id>/<app-name>` | yes — deploys that app |
| A **repository** | the registered [Git repository](/docs/applications/deploy-from-git), at the run's commit | `ws_<id>/pl_<pipeline-name>` | no |
| Nothing | nothing — steps run against an empty workspace | — | no |

Binding to a **repository** is how you build and push an image without an application attached: a
library, a base image, a tool — anything you want built from a repo but not deployed as a Miabi app.
Pick the repository and, optionally, a branch.

Over the API the field is `git_repository`, and it takes **a name or an id** — the JSON type decides
which, because an all-digit name is a valid handle:

```jsonc
"git_repository": "acme-api"   // the repository named acme-api
"git_repository": 3            // the repository with id 3
"git_repository": "123"        // the repository *named* 123, not id 123
```

Prefer the name: repository names are immutable and unique per workspace, and unlike an id they mean
the same thing on another install. Names resolve within the workspace only.

- **Branch** is what manual and scheduled runs build. Leave it blank to use the repository's default
  branch. A push trigger always builds the commit it carries, whatever this says.
- Images land under `pl_<pipeline-name>` in your workspace's registry namespace, kept apart from
  application images so a pipeline and an unrelated app of the same name never collide.

:::note One source, not two
A pipeline binds to an application **or** a repository, never both — each supplies the checkout, so
together there is no answer to what a run clones. Miabi refuses the combination.

The repository is picked from your registered Git repositories rather than typed as a URL. That keeps
the choice of which repositories a workspace may reach inside its permissions, and reuses the
credential already stored there.
:::

:::note Build cache for a repository-bound pipeline
An application-bound build shares its layer cache with direct deploys of that app, so invalidating the
app's cache applies to both. A repository-bound pipeline has no application: its builds still reuse
cached layers, but the only way to rebuild it from scratch is a run [without cache](#build-cache).
:::

A `uses: deploy` step needs an application, and a `uses: build` step needs a source. Both are
rejected when you save the pipeline, not at the moment a runner picks it up.

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

Turns the checked-out workspace into an image — a **Dockerfile** build, or **Cloud Native Buildpacks** (see below) — pushes it to the [built-in registry](/docs/registry/overview), captures the digest, and records an [Image](/docs/registry/overview) with build provenance (which runner produced it).

Two optional keys configure the build:

| Key | Default | Description |
|---|---|---|
| `dockerfile` | `Dockerfile` | Path to the Dockerfile, relative to the repository root. The build context is always the repository root. |
| `cache` | `true` | `false` rebuilds every layer of this step on every run. See [Build cache](#build-cache). |

A monorepo commonly keeps its Dockerfile under `docker/` while still building from the root:

```yaml
  - name: build
    uses: build
    dockerfile: docker/Dockerfile
```

The path must stay inside the repository — an absolute path or one that climbs out with `..` is rejected when the pipeline is saved, not at build time.

:::info Not yet available: `context` and `build-args`
The spec reserves `context` (a build context directory) and `build-args` (Dockerfile `ARG` values), but
runners cannot apply them yet. A pipeline that sets either is **refused when you save it**, with a
message naming the key, rather than being accepted and silently ignored.
:::

#### Buildpacks

When `dockerfile` names a file that does not exist, the runner falls back to Cloud Native Buildpacks. Without a `dockerfile` key the build expects a `Dockerfile` at the repository root and fails if there is none. Buildpack builds need a **docker-backed runner** (`MIABI_RUNNER_BUILDER=docker`); the rootless BuildKit backend builds Dockerfiles only.

### Build cache

Builds reuse cached layers, so a run rebuilds only what changed. The cache is kept per branch: a build of another branch reads its own cache and the app's main branch's, but writes only its own, so a branch can never seed layers into the cache the app's main branch builds from.

To rebuild from scratch:

- **One step, always** — set `cache: false` on the `build` step.
- **One run** — choose **Run without cache** on the pipeline, or **Re-run without cache** on a run (`no_cache: true` on the trigger or re-run API, `--no-cache` in the [CLI](/docs/cicd/cli)).
- **An application's next build** — invalidate the app's build cache (`miabi apps invalidate-cache`). It applies to pipeline runs and direct deploys of that app alike.

### `uses: deploy`

Deploys the image the `build` step produced, **by digest** — no rebuild: the node pulls exactly the digest the runner pushed. It targets the pipeline's bound app by default; `app: <name-or-id>` overrides the target. The deploy is queued once the whole run **succeeds**, so a failing later step stops it. This produces a normal Miabi [deployment](/docs/applications/overview) with the app's own deploy strategy, so releases, health checks, [canary](/docs/applications/canary-deployments) rollouts, and **rollback** all apply.

## Triggers

`on:` decides how a run starts — a run is always pinned to a specific commit:

- **`push`** — your Git host's push webhook fires a run for the pushed commit, when the branch is in `branches` (an empty list matches every branch). See [Deploy on push](/docs/cicd/git-push-deploy).
- **`manual`** — the **Run now** button or `POST …/trigger` (HEAD of the app's ref, or a commit you pass).
- **`schedule`** — a cron entry that runs the bound app's branch HEAD.

Your own CI can also start a run by calling the trigger API, or with `miabi pipeline run` — full setup is in the [pipeline example](https://github.com/miabi-io/miabi/tree/main/examples/pipeline).

## Environment & step outputs

### Defining your own

`env` sets variables for every step; a step's own `env` adds to it and wins on a collision:

```yaml
env:
  NODE_ENV: production
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}   # resolved from the workspace vault
steps:
  - name: test
    image: node:22
    env:
      CI: "true"
    run: npm ci && npm test
```

Values may reference a [workspace secret](/docs/secrets/overview) as `${{ secrets.NAME }}`. The
reference is resolved **by the control plane** when the job is dispatched — a runner never reads
your vault — and the resolved value is masked out of the live log stream. A reference to a secret
that does not exist fails the run before it starts, rather than running a build with a blank token.

When the same name is set twice, the last one wins:

```
pipeline env  <  values exported via $MIABI_ENV  <  step env
```

The run itself records what you *asked for*, not what it resolved to: the run and step detail (and
the API) show `${{ secrets.NPM_TOKEN }}` verbatim, so a run stays a readable audit record and no
plaintext credential is stored alongside it.

:::info What the runner can see
A resolved secret travels to the runner and lives in that job's process environment for the
duration of the step — the same trust already placed in a runner for registry credentials. A
workspace's secrets are therefore only as protected as the runners registered to it, which is
worth weighing before pointing a pipeline that references production credentials at a
[self-hosted runner](/docs/cicd/runners) on a shared machine.
:::

:::caution
`MIABI_*` names are reserved for the build context below and are rejected at save time, so a
pipeline cannot shadow the credentials the `deploy` step authenticates with. `env` is also rejected
on a `uses:` step: a built-in step runs no container of its own, so the value would be accepted and
silently dropped.
:::

:::note Getting a credential into a Dockerfile build
A `uses: build` step sees **neither** pipeline nor step `env` — it shells out to `docker build`, and
nothing crosses that boundary. (Build args would not be a safe channel either: a build arg is recorded in
the image history, where anyone who can pull the image can read it.)

Until BuildKit build secrets are supported, do the credentialed work in a **container step before
the build** and leave the result in the shared `/workspace`, which the build context is read from:

```yaml
  - name: npmrc
    image: node:22
    env:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    run: 'echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc'
  - name: build
    uses: build
```

Then make sure the file does not end up in the image — add it to `.dockerignore`, or write it
outside the build context.
:::

### Provided by the runner

The runner exports run context to every step as environment variables:

| Variable | Meaning |
|----------|---------|
| `MIABI_IMAGE` | Image ref the `build` step produced (`repo:tag`) — set for steps **after** build |
| `MIABI_IMAGE_DIGEST` | Immutable `repo@sha256:…` form of the same image |
| `MIABI_IMAGE_REPOSITORY` | The repository a `build` step pushes to |
| `MIABI_COMMIT` | Resolved commit the workspace was checked out at |
| `MIABI_REF` / `MIABI_BRANCH` | The ref and branch the run builds |
| `MIABI_PIPELINE` | The pipeline's name |
| `MIABI_RUN_ID` / `MIABI_RUN_NUMBER` | The run's id, and the per-pipeline run counter |
| `MIABI_APP_NAME` / `MIABI_APP_ID` | The bound application, when there is one |
| `MIABI_WORKSPACE_NAME` / `MIABI_WORKSPACE_ID` | The workspace the run belongs to |
| `MIABI_WORKDIR` | The shared workspace path inside steps (`/workspace`) |
| `MIABI_ENV` | File to append `KEY=VALUE` lines to, [for later steps](#exporting-values-between-steps--miabi_env) |
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

Runs execute on a registered [runner](/docs/cicd/runners); with no runner available, a run waits for one and then fails. The run view shows a **live stepper** — each step transitions running → succeeded/failed in real time over SSE — with **streaming logs** you can filter per step, plus the **built image** (repository, digest, commit, size, runner). Every run records its resolved commit and produced image, and the history is retained for audit.

A run is `pending` until a runner takes it, then `running`, and ends `succeeded`, `failed`, or `canceled`. It records what started it — `push`, `manual`, `schedule`, or `rerun`. **Re-run** starts a new run of the **same commit** (`POST …/runs/{runID}/rerun`). The pipelines list follows run transitions live, and the API exposes the same stream at `GET …/pipelines/runs/stream`.

From a terminal, `miabi pipeline ls`, `miabi pipeline run <pipeline> [--branch …] [--commit …] [--no-cache]`, and `miabi pipeline rerun <run-id> [--no-cache]` do the same — see the [CLI](/docs/cicd/cli).

## Relation to deployments

A pipeline's `deploy` step produces a **deployment** — the same release object you see everywhere in Miabi, so deployment history, health checks, and **rollback** all apply. Pipelines orchestrate *how* a release is produced; deployments are *what* gets produced. To deploy on every push, add a push trigger and webhook — see [Deploy on push](/docs/cicd/git-push-deploy).

## Related

- [Build runners](/docs/cicd/runners)
- [Container registry](/docs/registry/overview)
- [GitOps](/docs/cicd/gitops)
- [Deploy on push](/docs/cicd/git-push-deploy)
- [GitHub Actions](/docs/cicd/github-actions) — build on GitHub's runners and deploy the result.
- [Webhooks & notifications](/docs/cicd/webhooks-and-notifications)
