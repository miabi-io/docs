---
sidebar_position: 2
title: Adding a Node
description: Attach a remote Docker host to Miabi using a join token and the node agent.
---

# Adding a Node

Adding a node lets Miabi schedule workloads on a **remote Docker host** alongside the local engine. The process is short: prepare the remote host, generate a join token in the console, and run the [node agent](/docs/nodes/agent) on the remote machine.

![Add node dialog with a join token](/img/screenshots/node-add.png)

## Prerequisites

Before you start, make sure the remote host has:

- **Docker Engine** installed and running (`docker info` should succeed).
- **Outbound HTTPS/WebSocket** access to your Miabi control plane. No inbound ports are required — the agent dials out.
- A user able to access the local Docker socket (typically root or a member of the `docker` group).

:::caution
The agent exposes the host's Docker socket to Miabi. Only add hosts you fully control, and treat the join token as a secret.
:::

## The add-node flow

1. Open **Nodes** in the console (a platform-admin area — see [Platform Administration](/docs/administration/platform-admin)) and choose **Add node**.
2. Give the node a name and, optionally, labels you'll use for scheduling.
3. Miabi generates a **one-time join token** and shows the exact agent command to run on the remote host.
4. On the remote host, run the [agent](/docs/nodes/agent) with that token. It opens an outbound WebSocket tunnel back to the control plane.
5. The node appears as **connected** in the list once the tunnel is established and the Docker socket is reachable.

## About the join token

The join token authenticates the agent to the control plane during enrollment. It is **single-use and time-limited** — once the agent successfully joins, the token is consumed. If enrollment fails or expires, generate a fresh token from the node's detail page and retry.

:::tip
Store the agent install command in your provisioning tooling (cloud-init, Ansible, etc.) so new hosts join automatically. Generate a fresh token per host.
:::

## After joining

Once connected, the node is an eligible scheduling target. You can:

- Pin or label it for specific workloads.
- Run [housekeeping](/docs/nodes/housekeeping) to reconcile state and reclaim disk.
- [Import existing containers](/docs/nodes/docker-import) already running on that host.
- Promote the fleet to [cluster mode](/docs/nodes/cluster-mode) when you need cross-node orchestration.

## Next steps

- [Run the node agent](/docs/nodes/agent)
- [Cluster mode](/docs/nodes/cluster-mode)
