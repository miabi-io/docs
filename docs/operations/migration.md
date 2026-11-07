---
sidebar_position: 9
title: Migrate to another Miabi
description: Move a workspace, or many, from one Miabi install to another, directly, with its data.
---

# Migrate to another Miabi

A workspace can move from one Miabi install to another with its configuration, secrets, database
contents and volume data. The install receiving it (the **target**) pulls everything straight from
the install it leaves (the **source**) over HTTPS. You don't need a bucket or a passphrase.

Typical reasons: replacing a server, moving to a dedicated instance, or leaving a managed install for
your own.

## Before you start

Migration is **off** by default. The operator of each install turns it on:

```bash
sudo miabi stack env set MIABI_MIGRATION_ENABLED=true --apply
```

Turning it on makes nothing exportable. A workspace can only be pulled while its owner has a
migration **started** (step 1), and only by the install the code is pasted into.

## 1. Start the migration on the source

On the source, the workspace's **owner** opens **Workspace settings → Migration → Start migration**.
Miabi shows a **migration code**:

- It opens **that workspace only**, and can do nothing else on the API.
- It's shown **once**. Starting again replaces it.
- It stops working when an import completes with it, when you **Cancel migration**, or when it expires
  (after 24 hours by default, 7 days at most). A failed or partial import doesn't use it up, so you can
  try again.

While the migration is open, the same page shows whether the other Miabi has connected, each pull,
and when the import completed.

```bash
miabi workspace migration start          # with the CLI, as the workspace owner
```

A platform admin can start an **instance migration** under **Admin → Migration** instead. Its code
opens every workspace on the install until it's cancelled or expires, so several can be moved with one
code.

## 2. Import on the target

On the target, open **Workspace settings → Migration → Bring a workspace here** in one of your
workspaces, then:

1. Paste the code. Miabi connects to the source and shows what moves: the workspace, and its apps,
   databases, volumes and size.
2. Choose the name the workspace gets on the target (the source's name by default).
3. Pick the options, then **Start**.

| Option | What it does |
|---|---|
| **Copy data** | Dumps every database and archives every volume on the source, and loads them here. Without it, only the configuration moves. |
| **Freeze the source** | Stops the source workspace's apps and refuses changes there before anything is copied, so no write is lost between the copy and the switch. Its databases keep running so they can be dumped. Recommended for the real move. |
| **Deploy apps** | Starts the imported apps once everything is restored. Leave it off until DNS points here. |
| **Rehearse** | Moves the configuration only: no data, freeze or deploy. Use it to check names, quotas, image access and members, then delete the rehearsal workspace. A rehearsal doesn't use up the code. |
| **Mark the source as migrated** | Once the import succeeds, the source workspace stays frozen, with a note saying where it went. |

The import creates a **new workspace** that you own. The page follows its progress and ends with a
report.

```bash
miabi workspace import --code-file code.txt --freeze --deploy
```

With two saved CLI [contexts](/docs/cicd/cli), one per install, a single command does both steps: it
starts the migration on `old`, imports on `new`, and prints the report.

```bash
miabi workspace migrate --from old --to new --workspace shop --freeze --deploy
```

## 3. After the import

The report lists what came across, what was skipped, and what you finish by hand:

1. **Point DNS at the target**, then verify the workspace's domains there. Routes don't serve until
   their domain is verified.
2. **Re-issue Miabi-managed certificates.** Uploaded certificates came across as they were.
3. **Re-point GitOps and pipeline webhooks** at the target. Their secrets were regenerated.
4. **Re-issue API tokens** your automation used. Tokens never travel.
5. **Retire or roll back the source.** A frozen source stays frozen until you act on it: mark it as
   migrated, delete it, or unfreeze it (**Workspace settings → Migration → Unfreeze**) to roll back.

If the import fails, a frozen source is unfrozen automatically and serves again.

## What moves

A migration carries what a [portable workspace bundle](/docs/storage/backup-targets) carries: apps
and their environment, stacks, databases with their contents, volumes with their data, secrets,
configs, networks, registry and Git credentials, DNS connections, uploaded certificates, middlewares,
routes, domains, cron schedules, pipelines, GitOps sources and members (matched by email).

It does not carry deployment history, users and their sessions or tokens, Miabi-issued certificates,
webhook secrets, or DNS ownership. The report names each of these.

Values that hold a database's connection are rewritten to the target's database. Secrets and database
credentials referenced as `${{ secrets.NAME }}` stay references.

## Migrating many workspaces

On the source, a platform admin starts an instance migration under **Admin → Migration**. On the
target, a platform admin pastes its code under **Admin → Migration → Import workspaces**, and chooses
the workspaces (all of them by default). Each one becomes its own migration with its own report. The
target's admin owns the new workspaces, and their members come across by email.

The install's own setup — clusters, nodes, licence, SSO, SMTP, platform settings and user accounts —
is not migrated. Configure it on the target.

## Security

- The code carries a credential to the workspace, secrets included. Treat it like a password: paste
  it only into the install you're moving to, and cancel the migration if it leaks.
- The transfer uses HTTPS, and the target verifies the source's certificate. **Skip TLS verification**
  (under Advanced) exists for test installs only, and is recorded in the audit log. For a private CA,
  paste the CA bundle instead.
- The source keeps the staged dumps and archives for at most 24 hours. The target deletes them as
  soon as it has them, and a sweep removes any left behind.
- Starting, cancelling, each export, each read of the workspace's secrets, completing, retiring and
  unfreezing are all audit-logged on the source. Starting an import is audit-logged on the target.

## Troubleshooting

| Message | Meaning |
|---|---|
| `MIGRATION_DISABLED` | `MIABI_MIGRATION_ENABLED` isn't set on this install. |
| `that is not a migration code` | The code was mistyped or cut off. Copy it again from the source. |
| `the source refused the migration code` | The migration was cancelled, expired, or already completed with it. Start it again on the source. |
| `the source has no migration API` | The source is an older Miabi, or migration isn't enabled there. |
| `the source writes a newer workspace format` | Upgrade the target first. |
| `… failed its checksum` | A file changed or was corrupted in transit. Run the migration again. |
| `WORKSPACE_FROZEN` | The workspace is frozen by a migration. Retire it, or unfreeze it to roll back. |
