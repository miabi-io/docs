---
sidebar_position: 3
title: Node Agent
description: The thin Docker-proxy agent, its outbound-only tunnel and security model, and how to install and run it.
---

# Node Agent

The **node agent** is a small, standalone program (Go module `github.com/miabi-io/miabi-agent`) that connects a remote Docker host to your Miabi control plane. It is intentionally thin: it is a **Docker proxy** that exposes only the local Docker socket and nothing else.

## What the agent does

The agent has one job — let the control plane drive Docker on the remote host. It:

- Dials the control plane over an **outbound WebSocket tunnel**.
- Authenticates with a [join token](/docs/nodes/adding-a-node) during enrollment.
- Relays Docker API calls (pull, create, start, stop, inspect, prune…) to the **local Docker socket**.
- Reports node status, container state, and resource usage back over the same tunnel.

It runs no scheduling logic of its own — all decisions live in the control plane. That keeps the agent tiny and easy to audit.

## Security model

The agent is designed to be safe to run on hosts behind NAT or a firewall:

- **Outbound only.** The agent initiates the connection; the node needs **no inbound ports** open. The control plane never connects *to* the node.
- **Local socket only.** The agent exposes the host's Docker socket to the tunnel and nothing more — no shell, no arbitrary file access, no extra listeners.
- **Token-authenticated enrollment.** A single-use, time-limited join token authorizes the agent. After joining, the tunnel is authenticated for that node.
- **Encrypted transport.** The WebSocket tunnel runs over TLS to the control plane.

:::caution
Exposing the Docker socket is equivalent to root on the host. Run the agent only on machines you trust and control, and protect the join token like any other secret.
:::

## Installing and running the agent

The agent is configured through **environment variables** (with equivalent CLI flags for the bare
binary — see [Binary](#binary)). The two required values are:

| Variable | Description |
|----------|-------------|
| `MIABI_CONTROL_URL` | Your control plane's base URL, e.g. `https://miabi.example.com` |
| `MIABI_NODE_TOKEN` | The node's join token (`mbn_…`), shown once when you added the node |

After you create the node in the console, Miabi shows the exact `docker run` command for that node —
copy it and run it on the host. It looks like this:

```bash
docker run -d --name miabi-agent --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e MIABI_CONTROL_URL=https://miabi.example.com \
  -e MIABI_NODE_TOKEN=mbn_xxxxxxxx \
  miabi/agent:latest
```

### Install script

The install script does the same thing with a preflight check and status verification. It **does not
install Docker** — it checks that Docker is present and running, then starts the agent and confirms
it stayed up:

```bash
curl -fsSL https://get.miabi.io/agent | \
  MIABI_CONTROL_URL=https://miabi.example.com MIABI_NODE_TOKEN=mbn_xxxxxxxx bash
```

You can also pass the values as flags (`--control-url`, `--token`), override the image with
`--image` / `MIABI_AGENT_IMAGE`, or skip control-plane TLS verification for a self-signed panel with
`--insecure` / `MIABI_AGENT_INSECURE_SKIP_VERIFY=true`. Run with no values on an interactive shell
and it prompts for them.

### Binary

If you run the agent as a bare binary (e.g. under a systemd unit), pass the same environment:

```bash
MIABI_CONTROL_URL=https://miabi.example.com \
MIABI_NODE_TOKEN=mbn_xxxxxxxx \
./miabi-agent
```

Or use the equivalent flags — each defaults to its environment variable, and a flag wins when both are set:

```bash
./miabi-agent \
  --control-url https://miabi.example.com \
  --token mbn_xxxxxxxx
```

`--insecure` (env `MIABI_AGENT_INSECURE_SKIP_VERIFY`) skips control-plane TLS verification for a self-signed panel.

:::tip
Run the agent under a process supervisor (systemd `Restart=always` or `--restart unless-stopped`) so it reconnects automatically after reboots or transient network drops.
:::

## Verifying the connection

Back in the console, the node flips to **connected** once the tunnel is up and the Docker socket responds. From there it becomes an eligible scheduling target. If it stays disconnected, check the host's outbound network access and that the token hasn't expired — generate a fresh one from the node page and retry.

## Related

- [Adding a node](/docs/nodes/adding-a-node)
- [Nodes overview](/docs/nodes/overview)
