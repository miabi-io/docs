---
sidebar_position: 2
title: API Tokens
description: Create workspace-scoped API tokens, understand hashed storage, use them with the API, and revoke them.
---

# API Tokens

API tokens let scripts, CI pipelines, and integrations talk to Miabi without a browser session. Every token is **workspace-scoped** and stored **only as a hash** — Miabi never keeps the plaintext.

![API tokens](/img/screenshots/api-tokens.png)

## Creating a token

1. Open the workspace and go to **Settings → API Tokens**.
2. Click **Create token** and give it a descriptive name.
3. Optionally set an **expiry**.
4. Click **Create**.

Miabi displays the token **once**, at creation time. Copy it immediately and store it in a secret manager.

:::caution
The plaintext token is shown only once and cannot be retrieved later. If you lose it, revoke the token and create a new one.
:::

## Hashed storage

Miabi stores only a cryptographic **hash** of each token, never the token itself. On each request, Miabi hashes the presented token and compares it to the stored hash. Because the original value is never persisted, a database leak does not expose usable tokens.

## Workspace scoping

A token can only access the **workspace it was created in**, and only within the permissions of the role it was granted. This is enforced by the same dual mechanism as the console:

- **Middleware** validates the token and its role on every request.
- **Repository-layer `workspace_id` scoping** ensures the token can never read or write another workspace's data.

See [Roles & Permissions](/docs/workspaces/roles-and-permissions) for how role scope applies.

## Using a token with the API

Send the token as a **bearer token** in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" https://your-instance.example.com/api/...
```

The complete, interactive API reference — every endpoint, parameter, and response — is auto-generated and served at `/docs` on any running Miabi instance. Explore it at [https://demo.miabi.io/docs](https://demo.miabi.io/docs).

Prefer a command-line tool? The [Miabi CLI](/docs/cicd/cli) authenticates with these tokens and wraps the common flows (deploy, rollback, logs, apply). A least-privilege, app-scoped **deploy** token is the recommended credential for CI.

## Revoking a token

From **Settings → API Tokens**, open a token's menu and choose **Revoke**. Revocation takes effect immediately, and any request using the token is rejected from that point on. Tokens are also revoked automatically when the member who created them is removed from the workspace.

:::tip
Create one token per integration so you can revoke a single credential without disrupting the others.
:::
