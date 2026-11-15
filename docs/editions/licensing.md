---
sidebar_position: 2
title: Licensing
description: How to unlock Miabi Enterprise — contact sales for a signed, offline license key.
---

# Licensing

Miabi Enterprise is unlocked by a **signed license key**. The key is verified **offline**, with **no phone-home** — your instance never contacts a licensing server to validate or renew. The anonymous [installation statistics](/docs/operations/telemetry) are separate, and can be turned off.

![License activation](/img/screenshots/license.png)

## Getting a license

To unlock Enterprise features, contact **[sales@miabi.io](mailto:sales@miabi.io)**.

1. As a platform admin, open **Admin → License** in the web console and copy your **Install ID**.
2. Email **[sales@miabi.io](mailto:sales@miabi.io)** with that Install ID to obtain a license key.
3. Install the key on the same **Admin → License** screen. Enterprise features unlock immediately — no restart or network call required, and the console reflects your active edition.

:::tip
Keep your license key somewhere safe alongside your other operational secrets. You'll need it again if you rebuild or migrate the instance.
:::

### Installing from a file

For an install described as code, point Miabi at the license on disk instead of pasting it: set
`spec.license.file` in the [install manifest](/docs/administration/install-manifest), or
`MIABI_LICENSE_FILE` on a Compose install. The file is only read when the database holds no
license, so a key installed from **Admin → License** takes precedence.

## What a license is bound to

A license can name the deployment it belongs to, and every binding it carries must match:

| Binding | Matches |
|---|---|
| **Install ID** | This instance's Install ID exactly. It is generated once, stored in the database, and survives restarts and upgrades. |
| **URL** | The hostname of the instance's configured web URL. At install, the host you are installing through also counts. Scheme, port and path are ignored. |

A key bound to a different instance is refused at install. If a binding stops matching later — a
database restored onto a new instance, say — the license stays installed but grants **no**
features, and the License screen names the binding that failed.

## License states

| State | What it means |
|---|---|
| **Valid** | Within its term. Everything it grants works. |
| **Grace** | Past its expiry date, within the grace days the license carries. Everything still works, and admins see a warning. |
| **Degraded** | Past the grace period. Enterprise features **keep running** but become read-only: existing configuration is served, and nothing licensed can be created or changed. |
| **None** | No license, or one that fails verification. The instance runs as Community. |

Removing the license from **Admin → License** returns the instance to Community.

## Limits

Nodes, storage classes and platform-shared runners are unlimited in every edition, so no license
caps them. Besides feature flags, a license can carry one cap:

| Limit | Effect | Community |
|---|---|---|
| **Plans** | Creating a plan beyond the cap is refused. | 3 |

Where a license sets no plan cap, Enterprise is uncapped. The commercial tiers set it as follows:

| Tier | Plans |
|---|---|
| Professional | 5 |
| Business | 15 |
| Enterprise | Unlimited |

The License screen shows current usage against it. A node cap carried by an older license is
ignored.

## Where to go next

- [Community vs Enterprise](/docs/editions/community-vs-enterprise) — what each edition includes.
- [Platform Admin](/docs/administration/platform-admin) — the account that activates the license.
