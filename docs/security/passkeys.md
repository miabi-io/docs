---
sidebar_position: 3.5
title: Passkeys
description: Sign in with a passkey (WebAuthn) instead of a password and authenticator code, and configure the relying party for your domain.
---

# Passkeys

A passkey lets you sign in with your fingerprint, face or device PIN instead of a password. It is a
WebAuthn credential bound to your Miabi URL, so it can't be phished onto a look-alike site or reused
elsewhere. Passkeys are part of the Community edition and are on by default.

## Adding a passkey

1. Go to **Account → Security**. The **Passkeys** card lists the passkeys you already have.
2. Click **Add a passkey**.
3. Confirm your current password. If [two-factor authentication](/docs/security/two-factor-auth) is
   on, also enter a current authenticator code.
4. Optionally give it a **Name** (for example `Work laptop`), then click **Continue**.
5. Follow your browser's or password manager's prompt to create the passkey.

Miabi asks for your password again first so that a stolen session alone can't plant a passkey on
your account. You can register up to **10** passkeys. A passkey marked **Synced** is backed up by
your password manager or platform and follows you across your devices.

From the same card you can **Rename** a passkey or **Remove** it. Removing asks for your password;
also delete the passkey from your device or password manager afterwards.

:::note Single sign-on accounts
An account created by an OAuth/OIDC, SAML or SCIM provider has no Miabi password to confirm, so it
can't manage passkeys: its sign-in strength belongs to the identity provider. Accounts that sign in
with a local password or through [LDAP / Active Directory](/docs/security/sso#ldap--active-directory)
can.
:::

## Signing in with a passkey

On the login page, click **Sign in with a passkey** and choose the passkey in your browser's prompt.
You don't type an email address: the passkey identifies the account.

The button appears only when passkeys are enabled on the server and your browser supports them.
Your password keeps working as a fallback.

The usual account rules still apply to a passkey sign-in: a disabled account is refused, an
unverified email is refused when the platform requires verification, a required password change is
still enforced, and [enforced SSO](/docs/security/saml-and-scim#enforced-sso) refuses it for
non-admins.

## Passkeys and two-factor authentication

A passkey counts as **both factors**: possession of the device, plus the biometric or PIN that
unlocks it (Miabi requires user verification). Signing in with a passkey therefore skips the TOTP
prompt, even when two-factor authentication is on for the account.

Keep TOTP enabled anyway. It still protects password sign-ins, and adding a new passkey asks for a
TOTP code when two-factor is on.

Passkeys are not yet accepted as a factor for the
[admin console unlock](/docs/security/security-center#the-admin-console-unlock), which takes a TOTP code.

## Lost passkeys

If you lose the device that holds your only passkey, sign in with your password and remove the old
passkey from **Account → Security**.

A platform admin can also clear them: open the user under **Admin → Identity → Users** and click
**Reset passkeys**. This removes all of the user's passkeys and signs them out everywhere; they then
sign in with their password and can add new ones. The action is recorded in the audit log.

## Server configuration

Passkeys are bound to an origin, so they need a public URL. When neither `MIABI_WEB_URL` nor
`MIABI_API_URL` is set, passkeys stay off and the **Passkeys** card tells platform admins why.

| Variable | Default | Description |
|---|---|---|
| `MIABI_PASSKEYS_ENABLED` | `true` | Turn passkey sign-in on or off. Turning it off keeps stored passkeys, so turning it back on restores them |
| `MIABI_PASSKEY_RP_ID` | host of `MIABI_WEB_URL` | The WebAuthn relying-party ID. Falls back to the host of `MIABI_API_URL` when `MIABI_WEB_URL` is unset |
| `MIABI_PASSKEY_ORIGINS` | — | Extra comma-separated origins allowed to use passkeys, in addition to the scheme, host and port of `MIABI_WEB_URL` |

With nothing set beyond `MIABI_WEB_URL=https://miabi.example.com`, the relying-party ID is
`miabi.example.com` and the only allowed origin is `https://miabi.example.com`.

Set `MIABI_PASSKEY_RP_ID` to a parent domain (`example.com`) only when passkeys must also work on
sibling subdomains listed in `MIABI_PASSKEY_ORIGINS`. Passkeys are tied to the relying-party ID, so
changing it later invalidates every registered passkey. All three settings are read at startup;
restart Miabi after changing them.

## Related

- [Two-Factor Authentication](/docs/security/two-factor-auth)
- [Authentication](/docs/security/authentication)
