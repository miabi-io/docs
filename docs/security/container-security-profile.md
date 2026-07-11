---
sidebar_position: 7
title: Container Security Profile
description: Run application and job containers as a non-root UID (OpenShift-style), with an exemption for official marketplace apps.
---

# Container Security Profile

By default a container runs as whatever user its image declares — often `root`. The **container
security profile** hardens how a workspace's application and job containers run, so a compromised
or misbehaving container has far less power on the host.

## Profiles

Every workspace has an effective security profile, resolved from its plan (or a per-workspace
override):

| Profile | Behaviour |
|---------|-----------|
| **Default** | Containers run as the image's own user (may be `root`). No extra hardening — the historical behaviour. |
| **Restricted** | Containers are forced to run as a **non-root platform UID** with `no-new-privileges` set and the `NET_RAW` capability dropped — similar to OpenShift's *restricted* SCC. |

Under the restricted profile, application **and** one-off/cron **job** containers are started as
`MIABI_RESTRICTED_UID:0` (GID `0`, the arbitrary-UID convention). Images that hard-depend on being
`root` at runtime may not work under it.

## Enabling it

The restricted profile can be turned on two ways:

- **Per plan / workspace** — an admin sets the security profile to *Restricted* on a [plan](/docs/workspaces/plans-and-quotas) (or as a per-workspace override). This is an **Enterprise** capability; on Community, or once a license lapses, the effective profile is clamped back to *Default*.
- **Globally** — set `MIABI_FORCE_NON_ROOT_USER=true` to force every workspace's containers non-root regardless of plan. This is an absolute operator mandate and is not relaxed by the exemption below.

Relevant settings (see [Configuration](/docs/getting-started/configuration)):

| Setting | Controls |
|---------|----------|
| `MIABI_RESTRICTED_UID` | The platform non-root UID containers run as (default `100000`). |
| `MIABI_FORCE_NON_ROOT_USER` | Force the restricted profile platform-wide (default `false`). |
| `MIABI_SECURITY_INIT_IMAGE` | Tiny fallback image used to fix volume ownership (default `busybox:latest`). |

## Volumes and file ownership

A non-root process can't write to a volume owned by `root`. When the restricted profile applies,
Miabi makes an app's managed volumes writable by the platform UID **before** the real container
starts.

There's a subtlety worth knowing: Docker seeds an empty named volume with the image's content — and
the image's file ownership — the first time a container mounts it. So Miabi runs the ownership fix
using the **app's own image**: that first mount performs the seed copy, and the ownership fix then
corrects the seeded data, leaving a populated, correctly-owned volume the real container mounts
without re-copying. Images that lack a shell fall back to the `MIABI_SECURITY_INIT_IMAGE`.

You don't configure any of this — it happens automatically on deploy and for jobs.

## Official marketplace apps

Many curated [marketplace](/docs/marketplace/overview) images (WordPress, Ghost, Nextcloud, and
database engines) need their own baked-in user or a brief `root` startup and break when forced to
an arbitrary UID. Rather than dropping the whole workspace back to *Default* and losing hardening
for your own apps, a plan can grant the **Allow official image user** capability:

- Apps installed from an **official** marketplace template keep the image's own default user, even
  while the workspace profile is *Restricted*.
- Your own apps and jobs stay hardened.
- Only official-source installs qualify — a tenant cannot self-declare an app "official" to escape
  the profile. The marker is set by the platform at install time.
- The exemption never overrides a platform-wide `MIABI_FORCE_NON_ROOT_USER` mandate.

Toggle it on the plan next to the security profile selector (see
[Plans & Quotas](/docs/workspaces/plans-and-quotas)).

:::tip
Roll the restricted profile out to a test workspace first. Your own apps are usually fine; the
common breakage is a third-party image that assumes `root` — for official marketplace apps, enable
**Allow official image user**; for your own, adjust the image to run as a non-root user.
:::

:::note
This profile hardens the app/job containers Miabi runs. Managed databases run their engine images
as their own users and are not subject to the restricted profile.
:::
