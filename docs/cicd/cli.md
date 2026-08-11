---
sidebar_position: 1
title: CLI
description: Drive Miabi from the terminal or CI with the miabi command-line tool — deploy, roll back, stream logs, and manage apps, databases, secrets, and config files.
---

# CLI

The **`miabi` CLI** is the imperative command-line client for Miabi. Almost all of it is a **pure
consumer of the public HTTP API** — the same API the web console uses — so anything you can do in the
console you can script from a terminal or a CI pipeline. Its headline job is the deploy flow:

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
| `miabi apps set-source [app] (--image <img> \| --git-repo <url>)` | Switch the app between a prebuilt image and a Git build, or edit its current source. Keeps domains, env, volumes and history. |
| `miabi apps resync-pipeline [app]` | Reload the repository's `pipelines.yaml` — adopts one if the app has none, re-syncs it if it does. |
| `miabi apps rm [app] [--yes]` | Delete an application. |
| `miabi db …` | Manage database instances + logical databases (see below). |
| `miabi secrets …` | Manage the workspace secret vault (see below). |
| `miabi configs …` | Manage the workspace's configuration files (see below). |
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

### Configs

The workspace's [configuration files](/docs/secrets/configs) — file sets mounted into applications
read-only, encrypted at rest. Addressed by **name**; files come from disk with `--from-file`
(`[key=]path`, repeatable) or `--from-dir`.

```bash
miabi configs ls                                    # names, file counts, size, version
miabi configs get prom-conf                         # files and digest (no content)
miabi configs set prom-conf --from-file prometheus.yml          # create, or replace the file set
miabi configs set prom-conf --from-file rules/alerts.yml --merge # patch one file, keep the rest
miabi configs set nginx --from-dir ./conf.d --recursive
miabi configs set app --from-file app.conf=- < app.conf
miabi configs cat prom-conf prometheus.yml          # print one file
miabi configs edit prom-conf prometheus.yml         # edit in $EDITOR
miabi configs usage prom-conf                       # apps mounting it
miabi configs rm prom-conf [--yes]
```

`set` **replaces the whole file set** unless you pass `--merge`, so it stays idempotent in CI. Saving
redeploys every app mounting the config (unless it sets `reloadPolicy: none`) — `--yes` skips the
confirmation. Reading content (`cat`, `edit`, and `--merge`) is admin-only and audited; a config
marked `--sensitive` additionally requires `--reveal` to print.

Mounting a config into an app is declarative — see the
[manifest reference](/docs/cicd/manifest-reference#config).

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

## Managing the host

One group of commands is the exception to "pure API client": **`setup`, `upgrade` and `stack …` act
on the machine they run on**, through its Docker socket, and never touch the HTTP API. They are what
installs and operates a Miabi host — see
[Installation](/docs/getting-started/installation) and [Upgrades](/docs/administration/upgrades).

| Command | What it does |
|---|---|
| `miabi setup [--domain <host>] [--version <x.y.z>] [--image <ref>] [--yes]` | Install the stack on this host, or converge an existing install. Idempotent. Defaults to the latest published release. |
| `miabi upgrade [component] [--version <x.y.z>] [--image <ref>] [--yes]` | Roll the stack forward, rolling back automatically if the new image never becomes healthy. `--version` swaps only the tag (keeping a private registry); `--image` replaces the whole reference. |
| `miabi stack status` | What is running, its health, and any drift from the manifest. |
| `miabi stack restart [component] [--yes]` | Restart in place so containers re-read their on-disk config. |
| `miabi stack uninstall [--volumes] [--yes]` | Remove the stack's containers; `--volumes` also destroys the database. |
| `miabi stack migrate-config` | Rename the legacy `/etc/miabi/stack.yaml` to `/etc/miabi/miabi.yaml`. |

They all need **root** (they write `/etc/miabi` and use the Docker socket) and a Linux or macOS
Docker host. `-f, --file` points at a manifest other than `/etc/miabi/miabi.yaml`.

`setup` and `upgrade` install the latest published Miabi release, resolved from GitHub when the
command runs — the CLI does not carry a platform version, because it releases on its own cadence.
`MIABI_RELEASE_API` points that lookup at a mirror for a host with no route to GitHub, and
`--version`/`--image` skip it entirely.

`--version` accepts `1.8.0` or `v1.8.0` and swaps only the tag on the component's current
reference, so a private registry and non-Miabi components (the gateway) keep working;
`--image` replaces the reference outright. Pinning matters: a floating tag such as `latest`
warns, because a failed rollout has no distinct previous image to roll back to. See
[Upgrades](/docs/administration/upgrades).

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
- [Configuration files](/docs/secrets/configs) — the file sets managed by `miabi configs`.
- [Pipelines](/docs/cicd/pipelines) and [Git push deploy](/docs/cicd/git-push-deploy) — in-platform
  build/deploy automation.
