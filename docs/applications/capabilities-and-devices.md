---
sidebar_position: 8
title: Capabilities & devices
description: Grant an application the Linux capabilities and host devices it needs — a VPN's NET_ADMIN, a Zigbee stick's serial port — without handing it the host.
---

# Capabilities & devices

Some workloads need a little more of the kernel than a container gets by default. A
WireGuard container has to configure network interfaces. A debugger has to trace
processes. A Zigbee bridge has to read a USB stick.

Miabi grants those one at a time, from a fixed list, and only where an operator has
allowed it.

:::warning Off unless an operator turns it on
Nothing on this page works until the platform is started with
`MIABI_CONTAINER_GRANTS_ENABLED=true`. While it is off, no application can be granted
anything — in any workspace, including the platform's own system workspace — and the
controls do not appear in the console.
:::

## Why not "privileged"

Docker's `--privileged` gives a container every capability, every host device, an
unmasked `/proc`, and no seccomp or AppArmor profile. A container with it can mount the
host's disk and rewrite any file on it. Miabi does not offer it, because almost nothing
actually needs it:

| What you want to run | What it needs |
|---|---|
| WireGuard, Tailscale, OpenVPN | `NET_ADMIN` and `/dev/net/tun` |
| A debugger or profiler | `SYS_PTRACE` |
| Time sync inside the container | `SYS_TIME` |
| Zigbee/Z-Wave, serial, USB devices | one device node |
| rclone or s3fs (FUSE) | `SYS_ADMIN` and `/dev/fuse` |

One capability and at most one device covers each of them, and none of them needs your
disks.

## Granting one

**Applications → your app → Settings**, in **Kernel capabilities** and **Host devices**.
Both apply on the next deploy.

The card only appears when your workspace is **privileged** — a flag a platform admin
sets per workspace — and when the platform switch above is on. If you cannot see it,
that is why.

## What can be granted

Capabilities come in two tiers.

**Common** — available in any privileged workspace: `NET_ADMIN`, `NET_RAW`,
`NET_BIND_SERVICE`, `SYS_PTRACE`, `SYS_NICE`, `SYS_TIME`, `IPC_LOCK`, `CHOWN`,
`DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID`, `KILL`, `AUDIT_WRITE`.

**Elevated** — only in the platform's system workspace: `SYS_ADMIN`, `SYS_MODULE`,
`SYS_RAWIO`, `DAC_READ_SEARCH`, `MKNOD`. `SYS_ADMIN` is here because it permits
mounting, and a container that can mount can reach the host's filesystem.

Devices are allow-listed the same way: `/dev/net/tun`, `/dev/fuse`, `/dev/ttyUSB*`,
`/dev/ttyACM*`, `/dev/serial/*`, `/dev/i2c-*`, `/dev/gpiochip*`, plus `/dev/bus/usb/*`
in the system workspace only.

An app may be granted at most **12** capabilities and **8** devices. Host devices can only be
attached to an app that runs as a single **container**; a replicated swarm service that asks for one
is refused.

**Raw block devices are never granted.** `/dev/sda`, `/dev/nvme0n1`, `/dev/mapper/*`,
`/dev/mem` and the like are refused at every tier — they are the host's filesystem and
memory, which is the thing this feature exists to avoid handing over.

GPUs are not requested here. They have their own scheduling and inventory — see
[GPUs](/docs/applications/gpus).

## Interaction with the restricted security profile

A workspace whose plan selects the **restricted** profile cannot grant anything. That
profile exists to force a non-root container with capabilities dropped; adding them back
per-app would make it decorative. Move the app to a workspace without the profile, or
change the plan.

## In a manifest

Grants round-trip through `miabi.io/v1`, and go through the same checks as the console:

```yaml
spec:
  security:
    capabilities:
      add: [NET_ADMIN]
    devices: ["/dev/net/tun"]
```

An absent `security` block means **no grants**, not "leave what is there" — so removing
it from a manifest revokes what the app had. A capability the platform will not grant
fails the apply rather than being silently dropped. `security.addCapabilities`, the
spelling from before `capabilities` became a block, still parses.

## Hardening an app

The opposite direction needs no privileged workspace, and works in any workspace. Set it
in the app's **Settings** tab or under `security` in a manifest:

- **Drop capabilities** removes capabilities from Docker's default set, like
  `docker run --cap-drop`. Any Linux capability may be named, or `ALL` to keep only what
  the app is granted.
- **Read-only root filesystem** mounts the image read-only. Volumes stay writable, so an
  image that writes to `/tmp` or `/var/run` needs a volume there. One-off jobs keep a
  writable filesystem, since migrations and asset builds write into the image.
- **No new privileges** stops setuid binaries from raising a process's privileges.

```yaml
spec:
  security:
    readOnlyRootFilesystem: true
    noNewPrivileges: true
    capabilities:
      add: [NET_BIND_SERVICE]
      drop: [ALL]
```

Hardening layers on top of the workspace's
[security profile](/docs/security/container-security-profile) and can only take more
away. It applies to containers and replicated services alike, and needs a redeploy.

## What an operator sees

Every grant on the platform is listed under **Platform Admin → Infrastructure → Kernel
grants**, with the elevated ones flagged. A grant is otherwise only visible inside the
app that holds it, which is no help to whoever is accountable for the node it runs on.

Grants are re-checked at every deploy, not only when they are saved. If a workspace
loses its privileged flag, or the platform switch is turned off, the next deploy of an
app holding a grant fails rather than quietly continuing to apply it.
