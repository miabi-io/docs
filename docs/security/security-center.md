---
sidebar_position: 8
title: Security Center
description: Platform security policies for host ports and the admin console unlock, with audit mode, scoped overrides and a decision log.
---

# Security Center

**Platform admin → Platform → Security** is where a platform admin writes security rules once and
Miabi enforces them everywhere a tenant could get around them: the API, stack and compose import,
the deploy worker, and the admin console itself.

The page has four tabs:

| Tab | Contents |
|---|---|
| **Overview** | Posture checks: host ports published on every interface, pending requests, privileged workspaces, the admin console unlock, and the last 24 hours of decisions. |
| **Host ports** | The host-port policy, overrides for narrower scopes, and the approval queue that used to be **Infrastructure → Ports**. |
| **Admin access** | The admin console unlock policy. |
| **Events** | Every decision the policies made, filterable and exportable as CSV. |

:::info Edition
Policies are part of Miabi Enterprise (the `security_policies` feature). Community keeps the page
with an upgrade prompt, the host-port approval flow, the cloud-metadata block and the
[admin console unlock](#the-admin-console-unlock) with TOTP.
:::

## How policies work

A policy has a **kind** (what it controls), a **scope** (who it applies to) and a **mode**:

| Mode | Effect |
|---|---|
| **Off** | The policy is stored but not applied. |
| **Audit** | Decisions are made and recorded as **would deny**, but nothing is blocked. Use it to see what a rule would do before you enforce it. |
| **Enforce** | The policy blocks. |

Scopes, from widest to narrowest, are **platform**, **plan**, **organization** and **workspace**. The
most specific rule for a workspace wins, but a narrower rule may only **tighten** the platform rule.
Miabi refuses to save an override that loosens it, and ignores one if the platform rule changes
underneath it, unless the platform rule has **Allow exceptions** set.

Every denial and every audit-mode "would deny" is written to the **Events** tab and to the
[audit log](/docs/security/siem), so it reaches your SIEM with no extra configuration. Changes to a
policy are recorded too, with the old and new settings. Events older than 180 days are pruned from
the Security Center; the audit log keeps its own retention.

If a licence lapses, policies keep applying but can no longer be edited. They can still be deleted.
To ignore every stored policy without deleting it, start the platform with
`MIABI_SECURITY_POLICIES=off`.

## Host ports

| Setting | Effect |
|---|---|
| **Approval** | Today's behaviour: every request waits for an admin. |
| **Auto-approve in range** | Requests inside the listed ranges are approved automatically; the rest wait for an admin. |
| **Reject all** | Every request is refused with "host ports are disabled by platform policy". |
| **Bind address** | Approved ports are published on this address instead of `0.0.0.0`, for example `127.0.0.1` or a node's private IP. |
| **Privileged workspaces bypass review** | On by default. Turn it off so privileged workspaces wait for review like everyone else. |
| **Existing bindings** | What happens to ports approved before **Reject all**: **keep** them, **report** them on the Overview, or **revoke** them. |

The policy is checked at every point a port can be published:

- A request from the app page is refused with a `403`, and the page hides **Request host port** and
  says why.
- Stack and compose import skips the service's `ports:` and lists them in the import summary instead
  of failing the import.
- The deploy worker re-checks every approved binding when it publishes. A binding approved after
  **Reject all** took effect, or written by any other path, is not published and the deploy log says
  so.

**Admin container import** is exempt: an admin adopting a running container is choosing to keep
its ports. The import result warns when the policy would have refused them.

**Revoke existing host ports** appears when the platform rule is enforced as **Reject all** with
existing bindings set to **revoke**. It first lists every affected app and port. On confirmation
the bindings are rejected and each app is marked **redeploy required**; the port stops being
published at that app's next deploy.

## The admin console unlock

Signing in gives an admin the workspace side as usual. Opening the platform console additionally
asks for a code from their authenticator app (or a recovery code) and then stays **unlocked** for a
while. When the unlock lapses, a dialog asks for the code again, and whatever the admin was doing
carries on once they enter it.

- The unlock is bound to the login session. Signing out, or any other way the session ends, ends
  the unlock too, and a stolen unlock is useless without the session.
- **Sensitive actions** (installing or removing the licence, changing a security policy, deleting an
  organization, creating an admin-scope API key) also need the unlock to be recent, even inside its
  lifetime.
- Admin-scope **API keys** are a separate credential and do not ask for a code. Creating one does.
- Wrong codes lock **the unlock**, not the account, and the other admins are notified.

It protects against an unattended browser, a stolen session cookie, or a phished password on its
own. It does not protect against a script injected into the console (XSS), which can use an
already-unlocked session.

### Turning it on

- **Community:** start the platform with `MIABI_ADMIN_UNLOCK=true`. Every admin then needs TOTP; the
  unlock lasts 30 minutes, lapses after 10 idle minutes, sensitive actions need an unlock from the
  last 5 minutes, and 5 wrong codes lock it for 15 minutes.
- **Enterprise:** set the **Admin access** policy to enforce, with your own lifetime, idle timeout,
  sensitive window, attempt limit, lockout and an optional **allowed IPs** list, which applies to
  admin API keys too. Miabi refuses to require the unlock if the admin saving the policy has not set
  up two-factor authentication themselves.

:::caution Allowed IPs and proxies
The allowlist uses the client address Miabi resolves. Behind a proxy or load balancer, make sure it
passes the real client address, or every admin may be refused.
:::

Only TOTP is available as a factor today; passkeys, an admin PIN and SSO step-up are not built yet.

### Locked out

If an admin has lost their authenticator and their recovery codes, turn two-factor off from the
control-plane host, where host access is the trust anchor:

```bash
docker exec -it <control-plane container> miabi reset-2fa --email admin@example.com
```

They then set it up again from **Account → Security** before unlocking the console.
