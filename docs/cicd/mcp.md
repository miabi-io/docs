---
sidebar_position: 2
title: AI Agents (MCP)
description: Connect Claude, Cursor, or any MCP client to your Miabi panel with `miabi mcp` — inspect apps, diagnose deployments, and optionally deploy, all under your own token and RBAC.
---

# AI Agents (MCP)

`miabi mcp` runs a [**Model Context Protocol**](https://modelcontextprotocol.io) server, so an AI
agent — Claude Desktop, Claude Code, Cursor, or anything else that speaks MCP — can inspect and
operate your panel in conversation:

> *"Why did the last deploy of `guestbook` fail?"*

The agent calls a tool, the tool makes **one authenticated request to `/api/v1`**, and the answer
comes back as structured data it can reason about.

:::note No model runs inside Miabi
`miabi mcp` is a **client adapter**, not an AI feature. It doesn't call an LLM, doesn't need an
inference key, and sends nothing to a third party on its own. You bring your own AI client; Miabi
just exposes a typed interface it can drive. Everything below is part of the **free Community
Edition** CLI.
:::

## How it works

The server is a thin translation layer over the public REST API:

```
Claude / Cursor  ──MCP (stdio or HTTP)──▶  miabi mcp  ──HTTPS + Bearer token──▶  Miabi /api/v1
```

Because every tool call is an ordinary API request carrying **your** token, the agent inherits your
identity exactly:

- It can only reach **workspaces your token can reach**.
- It is bound by your **[RBAC role](/docs/workspaces/roles-and-permissions)** — a Viewer's agent
  cannot deploy, because the API refuses, not because the agent was asked nicely.
- Every mutation it makes lands in the **[audit log](/docs/operations/audit-log)** attributed to you.

There is no separate "agent account" to provision or revoke. Revoking the token revokes the agent.

## Prerequisites

The **[CLI](/docs/cicd/cli)**, installed and authenticated:

```bash
brew install miabi-io/tap/miabi

export MIABI_SERVER="https://miabi.example.com"
export MIABI_TOKEN="mb_…"          # Settings → API tokens
miabi workspace switch acme        # the default workspace for tool calls
```

`miabi mcp` picks up the same connection config as every other command — `--server`/`--token` flags,
`MIABI_*` environment variables, or a saved login context — so if `miabi apps list` works, so does
the MCP server.

## Connect a client

### Claude Code

```bash
# Read-only (recommended to start):
claude mcp add miabi -- miabi mcp

# Allow the agent to deploy, restart, and roll back:
claude mcp add miabi -- miabi mcp --allow-write
```

### Claude Desktop

Add the server to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "miabi": {
      "command": "miabi",
      "args": ["mcp"],
      "env": {
        "MIABI_SERVER": "https://miabi.example.com",
        "MIABI_TOKEN": "mb_…"
      }
    }
  }
}
```

### Any other MCP client

The command is `miabi` with the argument `mcp`, speaking **JSON-RPC over stdio**. Clients that prefer
HTTP can use the `--http` transport described [below](#transports).

## What the agent can do

### Tools

**Read tools are always available.** They return the same data the console shows.

| Tool | What it returns |
| --- | --- |
| `whoami` | The authenticated user and their default workspace |
| `list_workspaces` | The workspaces the token can access |
| `list_apps` | Applications in a workspace, with status |
| `get_app` | One app — status, image, tag, current release |
| `list_deployments` | An app's deployment history, most recent first |
| `get_deployment` | One deployment by its per-app number |
| `list_releases` | An app's releases (the rollback targets) |
| `list_databases` | Database instances in a workspace |
| `get_database` | One database instance — **credentials are never returned** |
| `list_secrets` | Secret **names** and metadata — **values are never returned** |

**Write tools require `--allow-write`.** Without that flag they are not registered at all: the agent
cannot see them, let alone call them.

| Tool | Effect |
| --- | --- |
| `deploy_app` | Deploy an app, optionally pinning a new image tag |
| `restart_app` | Restart an app |
| `start_app` | Start a stopped app |
| `stop_app` | Stop a running app |
| `rollback_app` | Roll back to a prior release |

Mutating tools are annotated as **destructive** in the protocol, so a well-behaved client asks you to
confirm before calling one. Treat that as a convenience, not a control — the real boundary is
`--allow-write` and your RBAC role.

### Resources

Apps and deployments are addressable as stable URIs the agent can attach as context — the
"@-mention" of an app:

```
miabi://workspaces/{workspace}/apps/{app}
miabi://workspaces/{workspace}/apps/{app}/deployments/{number}
```

### Prompts

Three ready-made investigations ship with the server:

| Prompt | Use |
| --- | --- |
| `diagnose_deployment` | Work out why an app's latest deployment failed or is unhealthy, and propose a fix |
| `app_health` | Summarize an app's current health and recent deployment activity |
| `workspace_overview` | Summarize a workspace's apps and databases, flagging anything unhealthy |

## Start read-only

The server is **read-only by default**, and that is the right way to begin. Let the agent answer
questions and diagnose failures for a while before you let it act; when you do enable
`--allow-write`, scope it with the token:

- Register the server with a token whose **role is Viewer** to keep it permanently read-only, no
  matter what flags the server was started with.
- Give a deploying agent a token in a **staging workspace** rather than one that reaches production.
- Register **two servers** — a read-only `miabi` and a `miabi-staging` with `--allow-write` — so the
  destructive tools only exist where you meant them to.

:::warning An agent can be talked into things
A model that reads your deployment logs is reading text you did not write. Treat `--allow-write` as
granting deploy rights to whatever ends up in that context window, and scope the token accordingly.
:::

## Transports

**stdio** (default) — the client launches `miabi mcp` as a subprocess and talks over its standard
input and output. This is what Claude Desktop, Claude Code, and Cursor expect.

**HTTP** — for clients that want a URL:

```bash
miabi mcp --http 127.0.0.1:8765     # endpoint: http://127.0.0.1:8765/mcp
```

:::warning Bind to loopback
The HTTP transport has **no authentication of its own** — anyone who can reach the port can drive the
server with your token. It rejects browser requests whose `Origin` isn't loopback, which blocks
DNS-rebinding, but that is not a substitute for binding to `127.0.0.1`. Never expose the port to a
network.
:::

## Troubleshooting

**The agent sees no tools.** The client failed to start the server. Check that `miabi` is on the
`PATH` the client uses — GUI apps like Claude Desktop often don't inherit your shell's `PATH`, so an
absolute path (`/opt/homebrew/bin/miabi`) is more reliable.

**Every tool call fails with an auth error.** The server uses the same config as the CLI, and a
GUI-launched process may not see your shell environment. Put `MIABI_SERVER` and `MIABI_TOKEN` in the
client's `env` block, or run `miabi login` so the credentials are saved to a context file.

**The agent asks which workspace to use.** Set a default with `miabi workspace switch <name>`, or use
a workspace-bound token. Tools accept an explicit `workspace` argument and fall back to the active
one.

**Deploy tools aren't offered.** Either the server was started without `--allow-write`, or the token's
role can't deploy. Both are working as intended.

## See also

- **[CLI](/docs/cicd/cli)** — the same connection config, and everything MCP exposes plus a great deal more
- **[API Tokens](/docs/security/api-tokens)** — creating and revoking the token the agent inherits
- **[Audit Log](/docs/operations/audit-log)** — what the agent did, and when
