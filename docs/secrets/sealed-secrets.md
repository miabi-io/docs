---
sidebar_position: 3
title: Sealed secrets
description: Commit secret values to Git safely — encrypt them to the workspace's public sealing key with the CLI, and let miabi apply or GitOps open them on the server.
---

# Sealed secrets

:::info Beta
Sealed secrets are a **beta** component (v1.0.0): supported and ready to use, though parts of the
workflow may still change. The sealed format (`sealed:v1`) is stable.
:::

A **sealed secret** is a secret value encrypted to your workspace's **public sealing key**. The
result is safe to commit next to your manifests: only Miabi, holding the workspace's private key,
can open it — and only for a `SealedSecret` with the name it was sealed for.

This lets a [GitOps](/docs/cicd/gitops) repository carry *every* resource a workspace needs,
secrets included, without anyone who reads the repository being able to read the values.

## How it works

1. Every workspace has a sealing **key pair**. The public half is not a secret; the private half is
   stored wrapped under the instance's master key and never leaves the server.
2. `miabi secrets seal` encrypts a value **locally**, on your machine or in CI, and prints a
   `kind: SealedSecret` manifest. The plaintext is never sent to the server.
3. `miabi apply` or a GitOps sync opens the value on the server, then stores it in the
   [vault](/docs/secrets/overview) under the workspace's data key, like any other secret.

A sealed value is bound to:

- **the workspace**: each workspace has its own key pair, so a value sealed for one workspace
  doesn't open in another;
- **the secret name**: the name is sealed inside the value, so copying a sealed value into a
  differently named `SealedSecret` fails instead of leaking it into another app.

## Seal a value

```bash
echo -n "$STRIPE_KEY" | miabi secrets seal stripe-key >> secrets.yaml
```

This appends:

```yaml
---
apiVersion: miabi.io/v1
kind: SealedSecret
metadata:
  name: stripe-key
spec:
  value: sealed:v1:2:YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOS…
```

Commit it, then apply it like any other manifest. It lands in the vault like any secret, and apps
reference it as usual, with `${{ secrets.stripe-key }}`.

A `SealedSecret` and a `Secret` share one name space. To move an existing secret into Git, replace its
`kind: Secret` with the sealed manifest: the vault entry is updated in place, not recreated.

### Sealing offline (CI, teammates)

The public key can be committed too. Anyone with it can seal values, without a Miabi token:

```bash
miabi secrets seal-key > .miabi/sealing.pub        # once, with read access to the workspace
miabi secrets seal api-token --from-file token.txt --public-key-file .miabi/sealing.pub
```

The workspace's public key is also shown under **Workspace settings → Encryption**.

## Moving existing secrets into Git

`seal -f` converts a manifest file. Every `kind: Secret` with a plaintext `value`, including those
inside a `Project`, becomes a `SealedSecret` of the same name. Comments are kept, and generated
Secrets are left as they are:

```bash
miabi secrets seal -f secrets.yaml --in-place
```

Without `--in-place` the result is printed instead. Applying the converted file takes over the
existing vault entries in place, so nothing is recreated and no app loses its secret in between.
Remove the plaintext from your Git history separately: converting the file doesn't rewrite past
commits.

## Refusing plaintext in a repository

Turn on **Sealed secrets only** on a [GitOps source](/docs/cicd/gitops#source-options) to refuse any
sync, diff, or single-resource sync while a `Secret` in the repository carries a plaintext `value`. The
error names the offending Secrets. `SealedSecret`s and `generate: true` Secrets still pass.

## Changing a sealed value

Seal the new value and replace `value` in Git. On the next apply or sync, the plan shows the
secret as changed, and Miabi opens and stores the new value.

- If the opened value is **unchanged** (you re-sealed the same value), the secret keeps its version
  and nothing redeploys.
- If it **changed**, the secret's version bumps and the apps referencing it redeploy, as with any
  rotation.

A sealed secret is shown with a **Sealed** badge in the vault. A value you set by hand in the console
or with `miabi secrets set` is replaced at the next apply or sync: Git stays the source of truth.

## Key rotation

A workspace **owner or admin** rotates the workspace's keys under **Workspace settings → Encryption**.
One rotation renews both keys:

- the **data key** that encrypts every stored secret, which is re-encrypted under the new key;
- the **sealing key**: a new key pair becomes active for new seals.

Older sealing keys are **kept**, so values already in Git keep opening after a rotation. The
Encryption tab shows how many secrets are still sealed to an older key. Re-seal them when convenient
to move them to the current key.

Rotation is allowed **at most once every 6 months**. The tab shows the last rotation and the date the
next one becomes available. It needs a signed-in session: API keys can't rotate keys.

## Moving or restoring a workspace

- **Disaster recovery**: sealing keys live in the control-plane database, wrapped under
  `MIABI_ENCRYPTION_KEY`, so a platform restore (`miabi restore`) brings them back.
- **Portable backups**: a portable workspace bundle carries the sealing keys,
  sealed by the bundle passphrase, so the restored workspace opens the same Git repositories. If the
  target workspace already has keys, it keeps its own active key and adds the imported ones as older
  versions.

Without a bundle passphrase, a bundle stores its contents unencrypted, sealing keys included. Set a
[bundle passphrase](/docs/storage/backup-targets#unencrypted-bundles) before exporting a workspace
that uses sealed secrets.

## If a sealing key is exposed

Anyone holding a workspace's **private** sealing key can open every value sealed to it. Old keys stay
valid after a rotation, so rotating alone doesn't revoke an exposed key. In that case:

1. Rotate the workspace's keys.
2. Change the underlying credentials at their source (the API provider, the database, …). The old
   sealed values in your Git history still open with the exposed key.
3. Seal the new values and commit them.

## Related

- [Secrets](/docs/secrets/overview): the vault sealed values are stored in.
- [Manifest reference](/docs/cicd/manifest-reference#sealedsecret): `kind: SealedSecret`.
- [CLI](/docs/cicd/cli#secrets): `miabi secrets seal` and `seal-key`.
- [Encryption](/docs/security/encryption): data keys, the master key, and crypto-shred.
