---
sidebar_position: 1
title: Community vs Enterprise
description: Miabi's open-core model, the AGPL-3.0 license, and the full feature comparison between Community and Enterprise.
---

# Community vs Enterprise

Miabi is **open-core**. The **Community edition** core is free and open source under **AGPL-3.0-or-later** and is fully functional — a complete, production-ready PaaS, not a crippled trial. A **commercial license** is also available for uses that don't fit the AGPL (for example, offering a modified Miabi as a hosted service without publishing your changes). The **Enterprise** code is under a separate commercial license and adds capabilities aimed at larger teams and regulated environments.

## How features are gated

Enterprise functionality is gated in two layers:

1. **Build tag.** Enterprise features are compiled behind the `enterprise` build tag. A binary built without it links a **deny-all stub** in place of those features.
2. **Signed license key.** Even in the Enterprise binary, features stay locked until they are unlocked at runtime by a **signed license key**, verified **offline** against a public key embedded in the binary.

This means there is no hidden code path to "turn on" Enterprise in a Community build, and no network call is needed to validate a license. See [Licensing](/docs/editions/licensing) for how activation works.

### Which artifact you run

The official **`miabi/miabi` images and release binaries are the Enterprise build** — the enterprise code is compiled in but stays dormant, so they run as free **Community until a license is installed**. That's the frictionless path: pull `miabi/miabi:latest`, and if you later buy a license, drop it in and features unlock — no re-pull or redeploy.

Miabi publishes **one edition**. The tags are `miabi/miabi:latest`, `miabi/miabi:<version>`, and their `-rootless` forms (mirrored to `ghcr.io/miabi-io/miabi`). There are no `-ce` or `-ee` image variants.

If you want a build with **zero enterprise code** (the deny-all stub), build it from source without the tag: `go build ./cmd/miabi`, or `docker build --build-arg GO_TAGS= -f docker/Dockerfile .` for an image. `make build` and the published images both pass `-tags enterprise`. No pure-Community image is published.

## Feature comparison

| Capability | Community | Enterprise |
|---|---|---|
| Core PaaS (apps, domains, TLS, DBs, backups, monitoring, marketplace) | ✓ | ✓ |
| Multi-node & cluster (Docker Swarm) | ✓ unlimited | ✓ unlimited |
| Plan catalog | 3 plans | ✓ unlimited unless the license sets a cap |
| Built-in container registry (local storage) | ✓ | ✓ |
| Registry S3/MinIO storage | — | ✓ |
| OAuth/OIDC SSO providers | one | multiple |
| Hide an SSO provider from the login page | — | ✓ |
| SAML 2.0 + enforced SSO · SCIM 2.0 provisioning | — | ✓ |
| LDAP / Active Directory sign-in | — | ✓ |
| Custom RBAC roles | — | ✓ |
| Per-resource permission policies | — | ✓ |
| Audit events recorded, with retention pruning | ✓ | ✓ |
| Viewing the audit log (platform and workspace) | — | ✓ |
| Audit export (JSON/CSV) | — | ✓ |
| SIEM streaming | — | ✓ |
| Per-workspace quota overrides | — | ✓ |
| Per-user workspace and membership limit overrides | — | ✓ |
| Plan placement (locations and node pools per plan) | — | ✓ |
| Database sizes (named CPU and memory sizes, offered per plan) | — | ✓ |
| Platform announcements to user inboxes | — | ✓ |
| Platform (control-plane) backup & restore | — | ✓ |
| Workspace analytics | 7 days | ✓ extended retention + CSV export |
| Private template registry (custom marketplace URL) | — | ✓ |
| Platform image registry mirror | — | ✓ |
| CLI + MCP server for AI agents (`miabi mcp`) | ✓ | ✓ |
| Workspace-owned build runners | ✓ unlimited | ✓ unlimited |
| Platform-shared runner pool | 2 runners | ✓ unlimited |
| GPU workloads (NVIDIA passthrough) | ✓ | ✓ |
| White-label [branding](/docs/administration/branding) (accent policy, logos, favicon, sign-in notice) | — | ✓ |
| Restricted (force non-root) security profile | — | ✓ |
| Canary deployments (automatic weighted ramp) | ✓ | ✓ |
| Manual canary control + routing by header/cookie/query/IP | — | ✓ |

:::tip
The Community edition includes the entire core platform — deploying apps, custom domains, automatic TLS, managed databases, backups, monitoring, the marketplace, and the built-in container registry (local storage) — plus **unlimited nodes**, **unlimited workspace-owned build runners**, up to three plans, two platform-shared runners, one SSO provider, and seven days of workspace analytics. Audit events are recorded and pruned on schedule in every edition. Most individual developers, startups, and homelabs never need anything beyond it.
:::

:::note
Enterprise is about identity, governance, and scale: multiple and hidden SSO providers with SAML, LDAP and SCIM, custom roles and per-resource policies, the audit log viewer with export and SIEM streaming, quota and per-user limit overrides, plan placement and database sizes, announcements, platform backup, S3/MinIO storage for the container registry, a private template registry and image mirror, an unlimited shared runner pool, white-label branding, a restricted security profile, and [advanced canary control](/docs/applications/canary-deployments#manual-mode). A license can also set explicit node and plan caps; see [Licensing](/docs/editions/licensing#limits).
:::

## Where to go next

- [Licensing](/docs/editions/licensing) — how the offline license key works and how to activate it.
- [Roles & Permissions](/docs/workspaces/roles-and-permissions) — the workspace role model (custom roles are Enterprise).
