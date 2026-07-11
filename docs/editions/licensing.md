---
sidebar_position: 2
title: Licensing
description: How Miabi's signed, offline, public-key-verified license key works and how to activate Enterprise.
---

# Licensing

Miabi Enterprise is unlocked by a **signed license key**. The key is verified **offline**, with **no phone-home** — your instance never contacts a licensing server to validate or renew.

![License activation](/img/screenshots/license.png)

## How the key works

Each license key is cryptographically **signed**. The Miabi binary embeds the matching **public key**, and at startup it verifies the signature locally:

- If the signature is valid, the entitlements encoded in the key (such as node count and feature flags) are unlocked.
- If the key is missing, malformed, or its signature doesn't verify, Enterprise features stay locked.

Because verification is purely cryptographic and local, Miabi works the same in air-gapped and offline environments as it does on a connected server. There is no usage reporting and no outbound license traffic.

:::note
Offline verification means you stay in control of your data and your network. The trade-off is that license changes are applied by installing a new key, not by an automatic refresh.
:::

## Community deny-all stub vs Enterprise build

The edition you run determines whether a license key even applies:

| Build | Command | Behavior |
|-------|---------|----------|
| **Community** | `make build` | Links a **deny-all stub** for Enterprise features. A license key has nothing to unlock — the features aren't compiled in. |
| **Enterprise** | `make build-ee` | Compiles Enterprise features behind the `enterprise` build tag, locked until a valid signed key unlocks them at runtime. |

So unlocking Enterprise requires **both** the Enterprise build and a valid license key. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) for the full feature matrix.

:::note
You usually don't build this yourself. The official **`miabi/miabi` images and release binaries are already the Enterprise build** (dormant until licensed), so you only need to install a key. A pure Community build — zero enterprise code — is produced only by building from source with `make build`; there is no published Community image.
:::

## Activating a license

To activate Enterprise:

1. Run an **Enterprise-capable build** of Miabi. The official `miabi/miabi` images and release binaries already are — if you build from source instead, use `make build-ee`.
2. As a platform admin, open the licensing screen in the web console.
3. Provide the **signed license key** to the instance.

Miabi verifies the signature offline and unlocks the entitlements immediately — no restart or network call required. The console then reflects your active edition and the features the key grants.

:::tip
Keep your license key somewhere safe alongside your other operational secrets. You'll need it again if you rebuild or migrate the instance.
:::

## Where to go next

- [Community vs Enterprise](/docs/editions/community-vs-enterprise) — what each edition includes.
- [Platform Admin](/docs/administration/platform-admin) — the account that activates the license.
