---
sidebar_position: 1
title: Community vs Enterprise
description: Miabi's open-core model, the AGPL-3.0 license, and the full feature comparison between Community and Enterprise.
---

# Community vs Enterprise

Miabi is **open-core**. The **Community edition** core is free and open source under **AGPL-3.0-or-later** and is fully functional — a complete, production-ready PaaS, not a crippled trial. A **commercial license** is also available for uses that don't fit the AGPL (for example, offering a modified Miabi as a hosted service without publishing your changes). The **Enterprise** code is under a separate commercial license and adds capabilities aimed at larger teams and regulated environments.

## How features are gated

Enterprise functionality is gated in two layers:

1. **Build tag.** Enterprise features are compiled behind the `enterprise` build tag, built with `make build-ee`. The standard Community binary (`make build`) links a **deny-all stub** in place of those features.
2. **Signed license key.** Even in the Enterprise binary, features stay locked until they are unlocked at runtime by a **signed license key**, verified **offline** against a public key embedded in the binary.

This means there is no hidden code path to "turn on" Enterprise in a Community build, and no network call is needed to validate a license. See [Licensing](/docs/editions/licensing) for how activation works.

### Which artifact you run

The official **`miabi/miabi` images and release binaries are the Enterprise build** — the enterprise code is compiled in but stays dormant, so they run as free **Community until a license is installed**. That's the frictionless path: pull `miabi/miabi:latest`, and if you later buy a license, drop it in and features unlock — no re-pull or redeploy.

Miabi publishes **one edition**. The tags are `miabi/miabi:latest`, `miabi/miabi:<version>`, and their `-rootless` forms (mirrored to `ghcr.io/miabi-io/miabi`). There are no `-ce` or `-ee` image variants.

If you want a build with **zero enterprise code** (the deny-all stub), build it from source: `make build` produces the Community binary, `make build-ee` the Enterprise-capable one. No pure-Community image is published.

## Feature comparison

| Capability | Community | Enterprise |
|---|---|---|
| Core PaaS (apps, domains, TLS, DBs, backups, monitoring, marketplace) | ✓ | ✓ |
| Multi-node & cluster (Docker Swarm) | ✓ unlimited | ✓ unlimited |
| Built-in container registry (local storage) | ✓ | ✓ |
| Registry S3/MinIO storage | — | ✓ |
| OAuth/OIDC SSO providers | one | multiple |
| SAML 2.0 + enforced SSO · SCIM 2.0 provisioning | — | ✓ |
| Custom RBAC roles | — | ✓ |
| Per-resource permission policies | — | ✓ |
| Audit log | ✓ | ✓ |
| Audit export (JSON/CSV) | — | ✓ |
| SIEM streaming + retention | — | ✓ |
| Per-workspace quota overrides | — | ✓ |
| Private template registry | — | ✓ |
| Workspace-owned build runners | ✓ unlimited | ✓ unlimited |
| Platform-shared runner pool | one | unlimited |
| White-label branding | brand | full |
| Restricted (force non-root) security profile | — | ✓ |
| HA control plane · cross-region DR | — | ✓ |

:::tip
The Community edition includes the entire core platform — deploying apps, custom domains, automatic TLS, managed databases, backups, monitoring, the marketplace, and the built-in container registry (local storage) — plus **unlimited nodes**, **unlimited workspace-owned build runners** and **one platform-shared runner**, one SSO provider, the audit log, and brand-level white-labeling. Most individual developers, startups, and homelabs never need anything beyond it.
:::

:::note
Enterprise is about identity, governance, scale storage, and resilience: multiple SSO providers with SAML and SCIM, custom roles and per-resource policies, audit export and SIEM streaming, quota overrides, S3/MinIO storage for the container registry, a private template registry, an unlimited platform-shared runner pool, full white-labeling, a restricted security profile, and HA/DR. (A license can also set an explicit node cap; by default both editions are uncapped.)
:::

## Where to go next

- [Licensing](/docs/editions/licensing) — how the offline license key works and how to activate it.
- [Roles & Permissions](/docs/workspaces/roles-and-permissions) — the workspace role model (custom roles are Enterprise).
