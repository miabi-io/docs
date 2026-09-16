---
sidebar_position: 3
title: Deploy on Push
description: Deploy automatically when you push, with a pipeline's push webhook or a GitOps source, and the encrypted Git and registry credentials behind them.
---

# Deploy on Push

There is no Git remote to push to in Miabi: you push to GitHub or GitLab as usual, and Miabi picks the
change up. Two things can act on a push:

| Listener | What a push does | Set up in |
|---|---|---|
| A **[pipeline](/docs/cicd/pipelines)** with an `on.push` trigger | Runs the pipeline at the pushed commit: build, test, then deploy the app it is bound to | The pipeline's **Push webhook** dialog |
| A **[GitOps source](/docs/cicd/gitops)** | Reconciles the workspace against the manifests in the repository on its next sweep, when the source syncs automatically | The GitOps source |

A Git-backed application on its own does **not** redeploy when you push. Deploys of it are started from
the console, the [CLI](/docs/cicd/cli), the API or [GitHub Actions](/docs/cicd/github-actions) — or by a
pipeline, as below.

![Push webhook setup for a pipeline](/img/screenshots/git-push-deploy.png)

## Push to deploy an application

1. **Give the app a pipeline.** The simplest is to commit a `.miabi/pipeline.yaml` to the repository. When
   you create a Git-source app from a repository that carries one, Miabi offers to adopt it, and from
   then on a deploy of that app runs through the pipeline. You can also create a pipeline in the console
   and bind it to the app. See [Pipelines](/docs/cicd/pipelines).
2. **Add a push trigger** to the pipeline, listing the branches that should deploy:

   ```yaml
   on:
     push: { branches: [main] }
   steps:
     - name: build
       uses: build
     - name: deploy
       uses: deploy
   ```

   Leave `branches` empty and every branch fires a run.
3. **Add the webhook to your Git host.** Open the pipeline and choose **Push webhook**. It shows the
   **payload URL** and the **secret**, with steps for GitHub and GitLab:
   - **GitHub** — *Settings → Webhooks → Add webhook*: paste the URL, set **Content type** to
     `application/json`, paste the secret, and choose **Just the push event**.
   - **GitLab** — *Settings → Webhooks*: paste the URL, paste the secret into **Secret token**, and tick
     **Push events**.

From then on:

1. You push a commit.
2. Your Git host calls the webhook. Miabi verifies it with the pipeline's secret — GitHub's
   `X-Hub-Signature-256` HMAC, or GitLab's `X-Gitlab-Token` — and rejects anything else.
3. If the pushed branch matches `on.push.branches`, a run starts, **pinned to the pushed commit**. A push to
   any other branch is accepted and ignored.
4. The run builds the image on a [runner](/docs/cicd/runners), and its `deploy` step rolls out a new
   **deployment**. Traffic shifts to the new release using the app's deploy strategy; the previous release
   stays available for rollback.

Because each push produces a standard deployment, you get the usual deployment history and **rollback** for free.

:::tip
Deploy a stable branch (such as `main`) to production, and point a separate app and pipeline at a staging
branch. Put tests and scans in the same pipeline, before the `deploy` step, so a failing commit never ships.
:::

:::caution
Anyone holding a pipeline's webhook secret can start runs of it. Revealing it requires the **Developer**
role; treat it like any other credential.
:::

## Push to reconcile a workspace

A [GitOps source](/docs/cicd/gitops) applies the manifests in a repository to a workspace. An **automatic**
source reconciles every three minutes, so a push reaches the workspace within a few minutes with no
webhook to configure. To apply a change sooner, or on a manual source, choose **Sync now** on the source.

## Stored credentials

To build from private repositories and deploy private images, Miabi stores two kinds of credentials, **encrypted at rest**:

| Credential | Used for |
|---|---|
| **Git credentials** | Cloning private repositories — for builds, pipelines, and GitOps sources |
| **Container-registry credentials** | Pulling base images and private application images, and pushing built images to a registry |

Webhooks do not use these: each pipeline has its own webhook secret.

Both are managed in the console and are **never stored in plain text and never logged**. See [Encryption](/docs/security/encryption) for how secrets are protected at rest.

:::caution
Grant credentials the least access they need — a deploy key or a scoped token rather than a personal account password — so a single connection can't reach more than it should.
:::

## Roles

| Action | Minimum role |
|---|---|
| View repositories and registry credentials | Viewer |
| Add, update, and test Git repositories and registry credentials | Developer |
| Reveal a pipeline's webhook URL and secret | Developer |
| Delete a Git repository or registry credential | Admin |

## Related

- [Deploy from Git](/docs/applications/deploy-from-git)
- [Pipelines](/docs/cicd/pipelines)
- [GitOps](/docs/cicd/gitops)
- [Encryption](/docs/security/encryption)
- [GitHub Actions](/docs/cicd/github-actions) — deploy from your own workflow instead.
- [Webhooks & notifications](/docs/cicd/webhooks-and-notifications) — outbound webhooks for deploy events.
