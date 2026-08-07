---
sidebar_position: 3
title: Deploy from a Docker Image
description: Deploy a prebuilt Docker image from any registry, with registry authentication and tag or digest pinning.
---

# Deploy from a Docker Image

If you already have a built image — from your CI pipeline, a public registry, or an internal one — Miabi can pull and run it directly. There is no build step; Miabi pulls the image and creates a [release](/docs/applications/releases-and-rollbacks) from it.

![The deploy-from-image configuration screen](/img/screenshots/deploy-from-image.png)

## Configuring the image

When creating an application, choose **Docker image** as the source.

1. **Image reference** — enter the full reference, for example `ghcr.io/miabi-io/guestbook:2.0.0` or `docker.io/library/nginx`.
2. **Tag or digest** — pin the version you want to run (see below).
3. **Registry credentials** — select stored credentials if the image is private.

## Tags vs. digests

You can reference an image by **tag** or by **digest**:

- **Tag** (`guestbook:2.0.0`) — readable and convenient. A mutable tag like `latest` can change underneath you, so prefer version tags.
- **Digest** (`guestbook@sha256:…`) — pins an exact, immutable image. Best for reproducible deploys where you must guarantee the bytes never change.

:::tip
For production, pin a specific tag or a digest rather than `latest`. This makes rollbacks meaningful and prevents surprise updates on the next deploy.
:::

## Registry authentication

For private images, add **container-registry credentials** to the workspace. These are stored encrypted at rest (see [Encryption](/docs/security/encryption)) and can be reused across applications. Miabi supports any standard Docker registry, including Docker Hub, GitHub Container Registry, GitLab Registry, and self-hosted registries.

Rather than pasting the token into the credential, you can point it at a [secret](/docs/secrets/overview) with `${{ secrets.NAME }}`. Miabi then reads the value from the vault on every pull, so rotating that secret rotates every credential using it — no edit, no redeploy of the credential.

Credentials are declarative too. A [manifest](/docs/cicd/manifest-reference#registry) can declare the credential and select it per application:

```yaml
apiVersion: miabi.io/v1
kind: Application
metadata: { name: api }
spec:
  image: ghcr.io/acme/api
  tag: v1.4.0
  registry: ghcr        # a Registry resource, or a credential already in the workspace
```

## Updating the image

To ship a new version, update the tag or digest in the application's source settings and redeploy. Miabi pulls the new image and rolls it out with a [zero-downtime](/docs/applications/releases-and-rollbacks) rolling switch, just like a Git deploy. Each pull becomes a new release you can roll back to.

## When to use image vs. Git

| Use a **Docker image** when… | Use **[Git](/docs/applications/deploy-from-git)** when… |
|------------------------------|--------------------------------------------------|
| Your CI already builds and pushes images | You want Miabi to build from source |
| You run a published, off-the-shelf image | You don't maintain a build pipeline |
| You need exact, digest-pinned reproducibility | You want push-to-deploy from a branch |
| You build elsewhere and only deploy in Miabi | You prefer buildpacks with no Dockerfile |

For curated off-the-shelf software, also consider the [Marketplace](/docs/marketplace/overview), which wraps common images into one-click templates.
