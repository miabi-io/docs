---
sidebar_position: 2.5
title: Service Accounts
description: Give CI pipelines, AI agents and scripts their own workspace identity with API keys, instead of a person's credentials.
---

# Service Accounts

A **service account** is a workspace member that is not a person. It has a role like any other
member and authenticates **only with API keys**. Use one for each CI pipeline, AI agent or script
that talks to Miabi, so that:

- automation does not act as, or depend on, a person's account. It keeps working when that person
  leaves the workspace;
- the audit log names the integration that acted, not whoever happened to create its key;
- you can revoke one integration without touching anyone else.

## What a service account cannot do

A service account can never get a console session:

- password login is refused, even if a password were somehow set;
- SSO (OAuth, SAML, LDAP) will not sign in to it;
- password reset sends nothing;
- SCIM provisioning cannot see or change it.

It has no mailbox: its email is a reserved address under `service-accounts.invalid`. It can't own a
workspace. It can't mint keys for itself either, because creating a key takes a signed-in session.

## Creating one

Workspace **Admins** manage service accounts from **Workspace settings → Service accounts**, or with
the API:

```bash
curl -X POST -H "Authorization: Bearer <SESSION_OR_ADMIN_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name": "GitHub Actions", "role": "developer"}' \
  https://your-instance.example.com/api/v1/workspaces/acme/service-accounts
```

The role is `viewer`, `developer` (the default) or `admin`. A service account belongs to the one
workspace that created it; for automation that spans workspaces, create one in each.

## Keys

```bash
curl -X POST -H "Authorization: Bearer <SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"name": "deploy", "scopes": ["read", "deploy"], "expires_in_days": 90}' \
  https://your-instance.example.com/api/v1/workspaces/acme/service-accounts/42/keys
```

The plaintext key is in the response, **once**. Keys are **bound to the account's workspace**.
Scopes, IP allowlists and expiry work as for [personal keys](/docs/security/api-tokens).

List keys with `GET …/service-accounts/{id}/keys` and revoke one with
`DELETE …/service-accounts/{id}/keys/{keyID}`.

## Deleting

Deleting a service account revokes all of its keys and removes it from its workspace. The
account itself is kept, disabled, so audit entries still say who acted.

Every change is recorded in the [audit log](/docs/operations/audit-log) as `service_account.*`.
