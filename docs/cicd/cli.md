---
sidebar_position: 1
title: CLI
description: Drive Miabi from the terminal or CI with the miabi command-line tool — deploy, roll back, stream logs, and manage apps, databases, and secrets.
---

# CLI

The **`miabi` CLI** is the imperative command-line client for Miabi. It's a **pure consumer of the
public HTTP API** — the same API the web console uses — so anything you can do in the console you can
script from a terminal or a CI pipeline. Its headline job is the deploy flow:

```bash
miabi apps deploy web --tag "$GIT_SHA" --wait
```

This deploys the app at the given image tag, **blocks until the deployment reaches a terminal
state**, and **exits non-zero if it failed** — exactly what you want in CI.

:::note
The CLI is a standalone tool released on its own cadence, separate from the Miabi server. Source,
releases, and the authoritative command reference live on GitHub:
**[github.com/miabi-io/miabi-cli](https://github.com/miabi-io/miabi-cli)**.
:::

## Install

**Homebrew** (macOS and Linux):

```bash
brew install miabi-io/tap/miabi
```

:::note
Homebrew 6 requires third-party taps to be trusted. The one-liner above handles it; if you tap first,
run `brew trust miabi-io/tap` before `brew install miabi`.
:::

**Go:**

```bash
go install github.com/miabi-io/miabi-cli@latest   # installs the `miabi` binary
```

Or grab a **prebuilt binary** for Linux, macOS, or Windows from the
[releases page](https://github.com/miabi-io/miabi-cli/releases/latest).

**Docker** — no install at all, which is handy in CI:

```bash
docker run --rm -e MIABI_URL -e MIABI_TOKEN miabi/miabi-cli:latest whoami

# deploy from a pipeline — exits non-zero if the rollout fails
docker run --rm -e MIABI_URL -e MIABI_TOKEN \
  miabi/miabi-cli:latest apps deploy web --tag "$GIT_SHA" --wait
```

## Authenticate

The CLI talks to your instance with an **[API token](/docs/security/api-tokens)**. Provide the URL
and token by environment variable — ideal for CI:

```bash
export MIABI_URL="https://miabi.example.com"
export MIABI_TOKEN="mb_…"       # created in the console: Settings → API tokens
miabi whoami                    # verify: shows the identity, scopes, and active workspace/app
```

Or log in once for interactive use — this validates the token and stores the URL + token in
`~/.miabi/config.yaml` (mode `0600`):

```bash
miabi --url "$MIABI_URL" --token "$MIABI_TOKEN" login
```

Configuration resolves in the order **flags → environment (`MIABI_URL`, `MIABI_TOKEN`) → config
file**. Point at a different file with `MIABI_CONFIG`.

:::tip
For CI, mint a least-privilege **deploy token** bound to one workspace and one app (scope `deploy`).
It can deploy that app and nothing else. Use broader `read`/`write` tokens for interactive work. See
[API tokens](/docs/security/api-tokens).
:::

## Context: workspace and app

Most commands act on an app in a workspace. Rather than repeating those every time, set them once as
**context** stored in `~/.miabi/config.yaml`:

```bash
miabi workspace list                 # id, name, role  (alias: ws)
miabi workspace switch acme          # set the active workspace
miabi workspace show                 # the currently active workspace

miabi use web                        # bind a default app for app-scoped commands
miabi use                            # show the current binding
miabi use --clear                    # unbind
```

With an app bound, app commands need no argument (`miabi apps deploy` targets the bound app). The
binding is **per workspace** and is cleared when you switch workspaces. You can always override
per-command with a positional app argument or `--workspace/-w`. A workspace-bound token already
targets its workspace, so it needs no `workspace switch`.

## Commands

App-scoped commands live under **`apps`** (alias of `app`) and take the app as their **first
argument**, or use the app bound with `miabi use`.

| Command | What it does |
|---|---|
| `miabi login` · `miabi whoami` | Store URL + token; show identity, scopes, and active context. |
| `miabi workspace ls \| show \| switch <name-or-id>` | List, show, or set the active workspace (alias: `ws`). |
| `miabi use [app] \| --clear` | Bind (or show/clear) the default app. |
| `miabi apps ls` | List the workspace's applications (marks the bound app). |
| `miabi apps create <name> (--image <img> [--tag] \| --git-repo <url> [--git-ref]) [--port] [--use]` | Create an app from an image or Git source. |
| `miabi apps deploy [app] [--tag <tag>] [--strategy <s>] [--wait] [--timeout 10m]` | Deploy; `--wait` blocks and exits non-zero on failure. |
| `miabi apps start \| stop \| restart [app]` | Control the app's container. |
| `miabi apps rollback [app] (--to <version> \| --to-previous) [--yes]` | Roll back to a previous release. |
| `miabi apps status [app] [--deployment <n>]` | Show app / deployment status. |
| `miabi apps logs [app] [--follow] [--tail N] [--deployment <n>]` | Runtime logs (or a deployment's build logs with `--deployment`); `--follow` streams. |
| `miabi apps deployments [app]` | Deploy history — the `NUMBER` column addresses a deployment. |
| `miabi apps releases [app]` | List an app's releases (by `VERSION`). |
| `miabi apps env ls [app]` | List the app's env vars (secret values are masked). |
| `miabi apps env set [app] KEY=VALUE [--secret]` | Set an environment variable. |
| `miabi apps env set [app] KEY --from-file <f> [--secret]` | Set the value from a file (or `-` for stdin) — keeps it out of your shell history. |
| `miabi apps env import [app] --from-file .env [--secret]` | Bulk-import variables from a file (`-` = stdin). |
| `miabi apps rm [app] [--yes]` | Delete an application. |
| `miabi db …` | Manage database instances + logical databases (see below). |
| `miabi secrets …` | Manage the workspace secret vault (see below). |
| `miabi apply -f <file> [--prune] [--dry-run]` | Converge to [declarative manifests](/docs/cicd/gitops). |
| `miabi delete -f <file> [--dry-run]` | Delete exactly the resources a manifest bundle names. |
| `miabi completion <shell>` | Shell completion (tab-completes app slugs). |

### Databases

Managed instances (PostgreSQL, MySQL, MariaDB, Redis, MongoDB, libSQL) and the logical databases on
them. Instances are addressed by **slug** (or numeric id).

```bash
miabi db ls                                   # list instances
miabi db engines                              # engines + default versions
miabi db create shop --engine postgres [--version 16] [--size-mb 2048] [--node <id>]
miabi db get shop
miabi db start | stop | restart shop
miabi db logs shop [--follow] [--tail 200]
miabi db credentials shop                     # reveal admin connection (admin)
miabi db upgrade shop --to 17 [--stop-apps]
miabi db rm shop [--yes]
# logical databases on an instance:
miabi db databases shop                              # list
miabi db databases create shop app_prod [--app web]  # optionally attach to an app
miabi db databases connection shop app_prod          # reveal connection (admin)
miabi db databases rm shop app_prod [--yes]
```

### Secrets

The workspace [secret vault](/docs/secrets/overview): values encrypted at rest, write-only over the
API, referenced from an app's env as `${{ secrets.NAME }}`. Addressed by **name**. Supply a value
with `--from-file` (or stdin) to keep it out of your shell history.

```bash
miabi secrets ls                              # list (no values)
miabi secrets get API_KEY                     # description, version, timestamps
miabi secrets set API_KEY --from-file api.key # create, or rotate if it exists
cat api.key | miabi secrets set API_KEY --from-file -
miabi secrets reveal API_KEY                  # print the value (admin; audited)
miabi secrets usage API_KEY                   # apps referencing it
miabi secrets rm API_KEY [--yes]
```

### AI agents

`miabi mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io) server, so an AI agent
(Claude Desktop, Claude Code, Cursor, …) can inspect and operate your panel. Each tool call becomes
one authenticated API request, so the agent inherits your token, workspace, and RBAC — no model runs
inside `miabi`.

```bash
claude mcp add miabi -- miabi mcp                 # read-only
claude mcp add miabi -- miabi mcp --allow-write   # also deploy, restart, roll back
```

See **[AI Agents (MCP)](/docs/cicd/mcp)** for the tool catalog, transports, and how to scope what an
agent is allowed to do.

### Common flags

- `--wait` — block on the deploy and **exit non-zero** when it ends `failed` (CI gating).
- `-o, --output table|json|yaml` (or the `--json` shorthand) — machine-readable output for
  `jq`/`yq`-friendly scripting; human tables otherwise.
- `-w, --workspace <name-or-id>` — override the active/bound workspace for one command.
- `--no-color` — plain output (also auto-disabled off a TTY or when `NO_COLOR` is set).
- `--verbose` — log every HTTP request to stderr.

## In CI/CD

The CLI is the recommended way to deploy from a pipeline. Set `MIABI_URL` and a deploy token as
`MIABI_TOKEN`, then call `apps deploy --wait`:

```yaml
# GitHub Actions
- name: Deploy to Miabi
  run: |
    go install github.com/miabi-io/miabi-cli@latest
    miabi apps deploy web --tag "${{ github.sha }}" --wait
  env:
    MIABI_URL:   ${{ vars.MIABI_URL }}
    MIABI_TOKEN: ${{ secrets.MIABI_DEPLOY_TOKEN }}
```

Because `--wait` exits non-zero on a failed rollout, a broken deploy fails the pipeline step. (The
container image `miabi/miabi-cli:latest` is a drop-in alternative to `go install`.)

If you'd rather not install anything, the same deploy is one HTTP call. The `{workspace}` segment is
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

- [AI agents (MCP)](/docs/cicd/mcp) — expose the panel to Claude, Cursor, or any MCP client via `miabi mcp`.
- [API tokens](/docs/security/api-tokens) — create the token the CLI authenticates with.
- [GitOps](/docs/cicd/gitops) — the declarative counterpart driven by `miabi apply` / `miabi delete`.
- [Secrets](/docs/secrets/overview) — the vault managed by `miabi secrets`.
- [Pipelines](/docs/cicd/pipelines) and [Git push deploy](/docs/cicd/git-push-deploy) — in-platform
  build/deploy automation.
