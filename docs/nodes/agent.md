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
- **Says which node it is.** On connect it reads its own Docker `/info` — over the socket it already
  has — and reports the host's name and, in [cluster mode](/docs/nodes/cluster-mode), its **swarm node
  id**. The control plane cannot work that out for itself, and without it a service's replica cannot
  be traced back to the node running it, so its logs and metrics become unreachable. The node is the
  authority on which node it is.

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
`--image` / `MIABI_AGENT_IMAGE`, or point it at your certificate authority with `--ca-cert` /
`MIABI_CA_CERT` (see [Private certificate authorities](#private-certificate-authorities)). Run with
no values on an interactive shell and it prompts for them.

### Binary

Pre-built binaries are published for **Linux and macOS** (amd64 and arm64) on each
[release](https://github.com/miabi-io/agent/releases). Use them to run the agent as a host process —
under systemd or launchd — on a node where you would rather not add a container to supervise the
containers.

:::note
There is no Windows build, deliberately. The agent reaches Docker over a **unix socket** or **TCP**,
and Windows serves its daemon on a **named pipe** — a Windows binary would build cleanly and then
fail to find Docker on every machine it ran on.
:::

Pass the same environment:

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

:::tip
Run the agent under a process supervisor (systemd `Restart=always` or `--restart unless-stopped`) so it reconnects automatically after reboots or transient network drops.
:::

## Private certificate authorities

If your control plane serves a **self-signed** or **private-CA** certificate, the agent will refuse
to connect:

```
agent disconnected  error="tls: failed to verify certificate:
                          x509: certificate signed by unknown authority"
```

This is the single most common agent failure, and the reason is worth stating plainly: **the host may
trust your CA, but the agent container does not.** The container ships its own certificate bundle,
which has never heard of your authority. `curl` works on the node and fails inside a container — same
machine, different trust store.

There are two ways out, and they are **not** equivalent:

| | What the agent does |
|---|---|
| **`MIABI_CA_CERT`** | Trusts **this** authority. Verification still happens, anchored on your CA — a forged certificate is still rejected. |
| `--insecure` | Trusts **any** certificate. No verification at all. Anyone able to intercept the connection can impersonate a control plane that drives Docker on this node. |

**Prefer the first.** `--insecure` (env `MIABI_AGENT_INSECURE_SKIP_VERIFY=true`) exists as a last
resort for someone who cannot get their CA onto the node.

### Supplying the CA

`MIABI_CA_CERT` accepts three forms, and the agent works out which:

**A file path** — usually the best option. The node already trusts the CA; mount the file it already
has, and it stays correct when the CA is rotated on the hosts:

```bash
docker run -d --name miabi-agent --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/pki/ca-trust/source/anchors/my-ca.crt:/etc/pki/ca-trust/source/anchors/my-ca.crt:ro \
  -e MIABI_CONTROL_URL=https://miabi.example.com \
  -e MIABI_NODE_TOKEN=mbn_xxxxxxxx \
  -e MIABI_CA_CERT=/etc/pki/ca-trust/source/anchors/my-ca.crt \
  miabi/agent:latest
```

**Base64** — a flat, transport-safe token. A certificate is multi-line, and an environment variable
is a poor place for newlines: they survive some transports and not others, and a PEM whose line
breaks were eaten is not a PEM at all.

```bash
-e MIABI_CA_CERT="$(base64 -w0 < my-ca.crt)"
```

**The PEM itself**, inline, for a hand-run agent.

The CA is **added** to the system trust pool, not swapped for it — an agent trusting a private CA can
still verify a public certificate later.

:::caution
Trusting a CA does **not** skip the hostname check. A certificate that does not name the address the
agent dials will still be rejected (`cannot validate certificate for <host>`), however well its
authority is trusted. Issue a certificate whose SANs include your control plane's hostname.
:::

### In a cluster

When you deploy agents from **Nodes → Manage cluster nodes**, the dialog offers the same three
choices — trust a CA file already on the nodes, paste a certificate, or skip verification — and
Miabi can fetch the certificate your control plane currently serves so you do not have to find it.
Whichever is in force stays visible on the Nodes page, so a workaround taken once to get a
self-signed certificate working cannot quietly become permanent. See
[Cluster mode](/docs/nodes/cluster-mode#manage-cluster-nodes).

## Verifying the connection

Back in the console, the node flips to **connected** once the tunnel is up and the Docker socket responds. From there it becomes an eligible scheduling target. If it stays disconnected, check the host's outbound network access and that the token hasn't expired — generate a fresh one from the node page and retry.

## Related

- [Adding a node](/docs/nodes/adding-a-node)
- [Nodes overview](/docs/nodes/overview)
