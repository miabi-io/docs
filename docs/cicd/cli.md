---
sidebar_position: 1
title: CLI
description: Drive Miabi from the terminal or CI with the miabi command-line tool — deploy, roll back, stream logs, and manage apps.
---

# CLI

The **`miabi` CLI** is the imperative command-line client for Miabi. It's a **pure consumer of the
public HTTP API** — the same API the web console uses — so anything you can do in the console you can
script from a terminal or a CI pipeline. Its headline job is the deploy flow:

```bash
miabi deploy --app web --tag "$GIT_SHA" --wait
```

This updates the app's image tag, deploys it, **blocks until the deployment reaches a terminal
state**, and **exits non-zero if it failed** — exactly what you want in CI.

:::note
The CLI is a standalone tool released on its own cadence, separate from the Miabi server. Source,
releases, and the authoritative command reference live on GitHub:
**[github.com/miabi-io/miabi-cli](https://github.com/miabi-io/miabi-cli)**.
:::

## Install

```bash
# Install script (from your Miabi instance)
curl -sSL "$MIABI_URL/cli/install.sh" | sh
```

Prebuilt binaries for Linux, macOS, and Windows (and packages) are published on the
[releases page](https://github.com/miabi-io/miabi-cli/releases). See the repository for the current
Homebrew/Scoop and container-image options.

## Authenticate

The CLI talks to your instance with an **[API token](/docs/security/api-tokens)**. Provide the URL
and token by environment variable — ideal for CI:

```bash
export MIABI_URL="https://miabi.example.com"
export MIABI_TOKEN="mb_…"       # created in the console: Settings → API tokens
miabi whoami                    # verify: shows the token's scopes and workspace
```

Or log in once for interactive use — this stores the URL and token in `~/.miabi/config.yaml`:

```bash
miabi login
```

Configuration resolves in the order **flags → environment (`MIABI_URL`, `MIABI_TOKEN`) → config
file**.

:::tip
For CI, mint a least-privilege **deploy token** bound to one workspace and one app (scope `deploy`).
It can deploy that app and nothing else. Use broader `read`/`write` tokens for interactive work. See
[API tokens](/docs/security/api-tokens).
:::

### Workspaces

A workspace-bound token already targets its workspace. For a multi-workspace token, set the active
workspace once:

```bash
miabi workspace list                 # id, name, slug, role
miabi workspace switch acme          # persists the active workspace in ~/.miabi/config.yaml
miabi workspace show                 # the currently active workspace
```

Subsequent commands then address that workspace automatically (you can still override per-command
with `--workspace`).

## Commands

| Command | What it does |
|---|---|
| `miabi login` | Store URL + token in `~/.miabi/config.yaml`. |
| `miabi whoami` | Show the token's scopes, workspace, and bound app. |
| `miabi workspace list \| show \| switch <slug-or-id>` | List, show, or set the active workspace. |
| `miabi deploy --app <slug> [--image <ref>] [--tag <tag>] [--digest <sha>] [--strategy <s>] [--wait] [--timeout 5m]` | Deploy an app; `--wait` blocks and exits non-zero on failure. |
| `miabi rollback --app <slug> [--release <n> \| --to-previous]` | Roll back to a previous release. |
| `miabi status --app <slug> [--deployment <n>] [--json]` | Show app / deployment status. |
| `miabi logs --app <slug> --deployment <n> [--follow]` | Show deployment logs; `--follow` streams them. |
| `miabi releases --app <slug> [--json]` | List an app's releases. |
| `miabi apps [--json]` | List the workspace's applications. |
| `miabi env set --app <slug> KEY=VALUE` | Set an environment variable. |
| `miabi env import --app <slug> --file .env` | Bulk-import environment variables from a file. |
| `miabi apply -f <file> [--prune] [--dry-run]` | Apply [declarative manifests](/docs/cicd/gitops) (create/update/converge). |

Common flags:

- `--wait` — block on the deploy and **exit non-zero** when it ends `failed` (CI gating).
- `--json` — machine-readable output on read commands, for `jq`-friendly scripting.
- `--app` — the app slug; the workspace comes from the token or `--workspace`.
- `--verbose` — log HTTP requests to stderr.

## In CI/CD

The CLI is the recommended way to deploy from a pipeline. Set `MIABI_URL` and a deploy token as
`MIABI_TOKEN`, then call `deploy --wait`:

```yaml
# GitHub Actions
- name: Deploy to Miabi
  run: |
    curl -sSL "$MIABI_URL/cli/install.sh" | sh
    miabi deploy --app web --image ghcr.io/org/web --tag "${{ github.sha }}" --wait
  env:
    MIABI_URL:   ${{ vars.MIABI_URL }}
    MIABI_TOKEN: ${{ secrets.MIABI_DEPLOY_TOKEN }}
```

Because `--wait` exits non-zero on a failed rollout, a broken deploy fails the pipeline step.

If you'd rather not install a binary, the same deploy is one HTTP call. The `{workspace}` segment is
a real workspace — its numeric id, its UID, or its handle. There is no `current` alias on the API
(the CLI resolves that client-side):

```bash
curl -fsS -X POST "$MIABI_URL/api/v1/workspaces/acme/apps/web/deploy" \
  -H "Authorization: Bearer $MIABI_TOKEN" \
  -d '{"tag":"'"$GIT_SHA"'"}'
```

The request body accepts `registry_id`, `tag`, and `strategy`. There is no `wait` field and no
`Idempotency-Key` header — the server does not de-duplicate retried deploys. Poll the deployment's
status to gate a pipeline on the rollout.

## Related

- [API tokens](/docs/security/api-tokens) — create the token the CLI authenticates with.
- [GitOps](/docs/cicd/gitops) — the declarative counterpart driven by `miabi apply`.
- [Pipelines](/docs/cicd/pipelines) and [Git push deploy](/docs/cicd/git-push-deploy) — in-platform
  build/deploy automation.
