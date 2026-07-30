---
sidebar_position: 2
title: Registry Administration
description: Enable the built-in registry, choose local or S3/MinIO storage, set per-workspace quotas, run garbage collection, and distribute built images across nodes.
---

# Registry Administration

The built-in [container registry](/docs/registry/overview) is managed by a **platform admin** from **Admin → Container Registry**. It is disabled by default, so single-node installs are unaffected until you turn it on.

## Enabling the registry

Enablement and the registry hostname are **environment-only, boot-time settings**. Set them and restart Miabi:

```bash
MIABI_REGISTRY_ENABLED=true
MIABI_REGISTRY_HOST=registry.example.com   # optional; defaults to registry.<external-base-domain>
```

Point DNS for that hostname at the gateway. On startup Miabi then:

1. runs the registry container on the gateway network, and
2. seeds its gateway route + middlewares (TLS redirect, authentication, and namespace rewrite) automatically.

:::info Why these two are not editable in the UI
The registry hostname is what every image reference the platform stores is anchored to, and matching a reference against it is how Miabi decides which workspace owns an image. Changing it while apps are running would strand the references recorded on past deployments and releases. Both fields are shown read-only on the settings page, with the value each one resolved to.

An invalid `MIABI_REGISTRY_HOST` (a scheme, a path, a wildcard, or a single-label name like `registry`) **refuses to boot** rather than starting with a value nothing matches.
:::

The remaining settings are editable from **Admin → Container Registry** and apply without a restart:

| Setting | Description |
|---------|-------------|
| **Storage driver** | `Local volume` (filesystem) or `S3 / MinIO`. |
| **Per-workspace quota (MB)** | Caps each workspace namespace's total image size (`0` = unlimited). |
| **Enable tag deletion & garbage collection** | Allows deleting tags and reclaiming space. |

## Storage

### Local (filesystem) — free

Images are stored in a managed Docker volume on the control-plane node. This is the default and is included in the **Community** edition.

### S3 / MinIO — Enterprise

Storing images in S3-compatible object storage (durable, off-box, shareable) requires an **[Enterprise license](/docs/editions/community-vs-enterprise)** (the `registry_s3` entitlement). Provide the bucket, region, optional endpoint (for MinIO/S3-compatible stores), access key, and secret key. The secret is **encrypted at rest** and never returned by the API.

:::warning Switching drivers does not migrate data
Changing the storage driver **recreates** the registry; existing images are **not** copied between drivers. Plan a migration (re-push) if you switch.
:::

## Garbage collection

Deleting a tag removes its manifest but not the underlying blobs. **Garbage collection** reclaims that space. Because collecting while images are being pushed is unsafe, Miabi runs it with the registry in **read-only mode** — pulls keep working, pushes pause briefly — then restores read-write automatically.

- A **daily** GC runs automatically when the registry is enabled with deletes on.
- You can also run it **on demand** with **Run garbage collection** on the settings page.

GC requires **Enable tag deletion & garbage collection** to be on.

## Multi-node image distribution

To let other nodes pull **Git-built** images (so deploys and rollbacks work across the cluster), the platform uses an internal registry token. It is **derived automatically from the master encryption key**, so no configuration is required for a standard install. To pin a specific value (e.g. to share with external tooling), set it explicitly — this overrides the derived token, and every party must then agree on the value:

```bash
MIABI_REGISTRY_PLATFORM_TOKEN=<a long random secret>
```

With the registry enabled, a successful Git build is tagged and pushed as `registry.<domain>/ws_<workspace-id>/<app-name>:<deployment-number>`, and a `:v<release-version>` tag is added once the deployment succeeds; both are recorded on the release. On deploy, a node that lacks the image pulls it from the registry. The push is **best-effort** — if it fails, the image stays node-local and the deploy proceeds, so single-node installs are unchanged.

The recorded reference uses the immutable `ws_<id>` namespace rather than the workspace name you push to by hand, so a workspace rename cannot break a rollback to an older deployment. Both forms address the same storage.

### Cross-workspace images are refused

A node pulls a distributed image with the **platform credential**, which is accepted for every workspace namespace — that is what lets a runner push on any tenant's behalf. So the image reference itself is checked: an app may only reference the built-in registry under **its own workspace's namespace**, whether written as `registry.<domain>/<your-workspace>/…` or `registry.<domain>/ws_<your-id>/…`.

Naming another workspace's namespace is rejected when the app is saved and again at deploy time. Images in other registries (Docker Hub, GHCR, a private registry) are unaffected — those are pulled with the workspace's own [registry credential](/docs/registry/overview).

## Configuration (environment)

`MIABI_REGISTRY_ENABLED` and `MIABI_REGISTRY_HOST` are the **only** source for enablement and the hostname — the UI shows them read-only, and a change takes a restart. Any other `MIABI_REGISTRY_*` value set in the environment is **authoritative on boot** and overrides the Settings UI (the same convention as `MIABI_EXTERNAL_BASE_DOMAIN`).

| Variable | Purpose |
|----------|---------|
| `MIABI_REGISTRY_ENABLED` | Run the registry (default `false`). Restart to change. |
| `MIABI_REGISTRY_HOST` | Public host; defaults to `registry.<external-base-domain>`. Restart to change. |
| `MIABI_REGISTRY_STORAGE` | `filesystem` or `s3`. |
| `MIABI_REGISTRY_IMAGE` | Override the registry image (default `registry:3`). |
| `MIABI_REGISTRY_AUTH_URL` | Address the gateway uses to reach Miabi's auth endpoint (falls back to `MIABI_CONTROL_URL`). |
| `MIABI_REGISTRY_PLATFORM_TOKEN` | Shared secret enabling multi-node build distribution. |
| `MIABI_REGISTRY_S3_ENDPOINT` / `_BUCKET` / `_REGION` / `_ACCESS_KEY` / `_SECRET_KEY` / `_FORCE_PATH_STYLE` | S3/MinIO storage (Enterprise). |

See [Configuration](/docs/getting-started/configuration) for the full environment reference.

## Related

- [Container registry overview](/docs/registry/overview) — pushing, pulling, and browsing images.
- [Community vs Enterprise](/docs/editions/community-vs-enterprise) — local storage is free; S3/MinIO is Enterprise.
