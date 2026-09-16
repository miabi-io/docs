---
sidebar_position: 5
title: GitHub Actions
description: Deploy to Miabi from a GitHub Actions workflow with the official deploy-action — build your image, push it, then roll it out and fail the job if the deploy fails.
---

# GitHub Actions

[`miabi-io/deploy-action`](https://github.com/miabi-io/deploy-action) deploys an application to your
panel from a GitHub workflow. It installs the [`miabi` CLI](/docs/cicd/cli) and runs
`miabi apps deploy` against your panel's public `/api/v1` API — **no SSH, no Docker socket, no server
access**. GitHub needs nothing but a URL and a token.

The usual shape: build and push your image, then point Miabi at the new tag and wait for the rollout.

## Quick start

1. Create a **workspace-bound [API token](/docs/security/api-tokens)** with deploy permission for the
   app.
2. Add two entries to the repository — a **variable** `MIABI_SERVER` (e.g. `https://miabi.example.com`)
   and a **secret** `MIABI_TOKEN`.
3. Add the step:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # … build and push your image tagged ${{ github.sha }} first …
      - name: Deploy to Miabi
        uses: miabi-io/deploy-action@v1
        with:
          app: web
          tag: ${{ github.sha }}
          server: ${{ vars.MIABI_SERVER }}
          token: ${{ secrets.MIABI_TOKEN }}
```

## Inputs

| Input | Default | Notes |
|---|---|---|
| `app` | — | The app's name (handle). Omit it when the token is bound to a single app. |
| `tag` | `${{ github.sha }}` | The image tag to deploy — normally the tag your build step just pushed. |
| `strategy` | app default | `recreate` · `rolling` · `canary`. See [releases & rollbacks](/docs/applications/releases-and-rollbacks). |
| `server` | `$MIABI_SERVER` | Your panel URL. |
| `token` | `$MIABI_TOKEN` | The API token. **Always** from `secrets`, never inline. |
| `workspace` | — | Name or id. Only needed when the token isn't bound to one workspace. |
| `wait` | `true` | Block on the rollout and fail the job if it fails. |
| `timeout` | `10m` | Max wait while `wait: true` (Go duration — `10m`, `300s`). |
| `version` | `latest` | Pin the CLI version (`1.4.0`) for a reproducible job. |

`server` and `token` also read the `MIABI_SERVER` / `MIABI_TOKEN` environment variables — the same
ones the CLI uses — which is tidier when several steps share them:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      MIABI_SERVER: ${{ vars.MIABI_SERVER }}
      MIABI_TOKEN: ${{ secrets.MIABI_TOKEN }}
    steps:
      - uses: miabi-io/deploy-action@v1
        with:
          app: web
```

## Build, push, deploy

The complete flow, building to GitHub's own registry:

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Deploy to Miabi
        uses: miabi-io/deploy-action@v1
        with:
          app: web
          tag: ${{ github.sha }}
          server: ${{ vars.MIABI_SERVER }}
          token: ${{ secrets.MIABI_TOKEN }}
          timeout: 15m
```

The app must already point at that repository — set its image to
`ghcr.io/<owner>/<repo>` once, with a [registry credential](/docs/applications/deploy-from-image) if
the package is private. The action only moves the app to a new **tag**; it doesn't create the app or
change where its image comes from.

:::tip Deploy the digest, not a moving tag
`${{ github.sha }}` is already immutable, which is why it's the default. Avoid deploying `latest` —
a rollback then has nothing distinct to roll back *to*.
:::

## Other shapes

**Deploy on a release tag** — ship what you tagged, not what you merged:

```yaml
on:
  release:
    types: [published]

steps:
  - uses: miabi-io/deploy-action@v1
    with:
      app: web
      tag: ${{ github.event.release.tag_name }}
      server: ${{ vars.MIABI_SERVER }}
      token: ${{ secrets.MIABI_TOKEN }}
```

**Fire and forget** — start the rollout and let the job finish:

```yaml
  - uses: miabi-io/deploy-action@v1
    with:
      app: web
      wait: 'false'
      server: ${{ vars.MIABI_SERVER }}
      token: ${{ secrets.MIABI_TOKEN }}
```

**Several apps from one repository** — repeat the step per app; a matrix works too:

```yaml
  - uses: miabi-io/deploy-action@v1
    with: { app: api, tag: '${{ github.sha }}', server: '${{ vars.MIABI_SERVER }}', token: '${{ secrets.MIABI_TOKEN }}' }
  - uses: miabi-io/deploy-action@v1
    with: { app: worker, tag: '${{ github.sha }}', server: '${{ vars.MIABI_SERVER }}', token: '${{ secrets.MIABI_TOKEN }}' }
```

## What it actually runs

Two steps: install the pinned `miabi` CLI onto the runner, then

```bash
miabi apps deploy <app> --tag <tag> [--strategy …] [--workspace …] --wait --timeout 10m
```

`--wait` exits non-zero on a failed rollout, so **a broken deploy fails the job** — which is the
whole point of leaving `wait: true` on. Because it's the CLI underneath, anything the CLI can do is
one `run:` step away if you outgrow the action:

```yaml
  - uses: miabi-io/deploy-action@v1        # installs the CLI and deploys
    with: { app: web, server: '${{ vars.MIABI_SERVER }}', token: '${{ secrets.MIABI_TOKEN }}' }
  - run: miabi apply -f miabi/app.yaml    # …then use it directly (repeat -f per file)
    env:
      MIABI_SERVER: ${{ vars.MIABI_SERVER }}
      MIABI_TOKEN: ${{ secrets.MIABI_TOKEN }}
```

## Tokens and safety

- **Scope the token to the workspace**, and to deploy permission. A workspace-bound token also lets
  you drop the `workspace` input entirely.
- **Never inline it.** Pass it from `secrets`; the action hands it to the CLI through the environment
  and the CLI never logs it.
- Treat `MIABI_SERVER` as a **variable**, not a secret — masking a URL only makes logs harder to read.
- Rotate through the panel: revoking a token stops every workflow using it, immediately.

## Runners

Linux and macOS (`ubuntu-*`, `macos-*`), on amd64 or arm64. **Windows runners are not supported** —
put the deploy step on a Linux runner. A self-hosted runner works as long as it can reach your panel
over HTTPS, which is what makes this practical for a panel on a private network.

## Migrating from `url`

The `url` input and `MIABI_URL` variable are deprecated in favour of `server` / `MIABI_SERVER`, to
match the CLI's `--server` flag. Both still work and log a warning; precedence is `server` input →
`url` input → `MIABI_SERVER` → `MIABI_URL`.

```diff
       - uses: miabi-io/deploy-action@v1
         with:
-          url: ${{ vars.MIABI_URL }}
+          server: ${{ vars.MIABI_SERVER }}
           token: ${{ secrets.MIABI_TOKEN }}
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Miabi server not set` | No `server` input and no `MIABI_SERVER` in the environment. |
| `401` / token rejected | Revoked or wrong-workspace token, or the secret isn't exposed to this job (forks don't get secrets). |
| `application "web" not found` | The `app` value is the app's **handle**, not its display name — check `miabi apps ls`. |
| Job hangs then fails on timeout | The rollout is genuinely stuck: check the app's [deployment logs](/docs/applications/logs-and-timeline). Raise `timeout` for slow images. |
| Deploy succeeds, nothing changes | The tag you pushed isn't the tag you deployed — build and deploy must use the same value. |

## When to use something else

- **No external CI at all** → [Deploy on Push](/docs/cicd/git-push-deploy): a Miabi pipeline with a push
  trigger builds and deploys on push, no GitHub workflow needed.
- **Building on your own hardware** → [Pipelines](/docs/cicd/pipelines) run on Miabi's own
  [runners](/docs/cicd/runners), so images never leave your network.
- **Managing the whole workspace as code** → [GitOps](/docs/cicd/gitops) reconciles apps, databases,
  routes and secrets from a repository, rather than deploying one app.

## Related

- [CLI](/docs/cicd/cli) — the tool the action wraps, and everything else it can do.
- [API tokens](/docs/security/api-tokens) — creating and scoping the token.
- [Deploy from an image](/docs/applications/deploy-from-image) — pointing the app at your registry.
- [Releases & rollbacks](/docs/applications/releases-and-rollbacks) — strategies, and undoing a bad deploy.
