---
sidebar_position: 3
title: Two-Factor Authentication
description: Enable TOTP-based two-factor authentication, enroll an authenticator, and recover access.
---

# Two-Factor Authentication

Two-factor authentication (2FA) adds a second step to login: after your password, you enter a time-based one-time code from an authenticator app. Miabi supports **TOTP** (Time-based One-Time Password), compatible with apps like Google Authenticator, 1Password, Authy, and Aegis.

![Two-factor authentication](/img/screenshots/two-factor.png)

## Why enable 2FA

A password alone can be phished or leaked. With 2FA, an attacker also needs the rotating code from your device, dramatically reducing the risk of account takeover. We recommend it for every account, and especially for [Owners and Admins](/docs/workspaces/roles-and-permissions).

## Enabling 2FA

1. Go to **Account → Security → Two-Factor Authentication**.
2. Click **Enable 2FA**. Miabi shows a **QR code** and a text secret.
3. Scan the QR code with your authenticator app (or enter the secret manually).
4. Enter the current 6-digit code to confirm enrollment.
5. Miabi displays your **recovery codes** — save them now.

Once confirmed, every future login will prompt for a TOTP code after your password.

## Recovery codes

During enrollment, Miabi generates a set of single-use **recovery codes**. Use one to sign in if you lose access to your authenticator device.

:::caution
Store recovery codes somewhere safe and offline (a password manager or printed copy). Each code works only once. If you exhaust or lose them, regenerate a new set from **Account → Security** while still signed in.
:::

## Logging in with 2FA

1. Enter your email and password.
2. When prompted, enter the current code from your authenticator app.
3. If you can't reach your device, choose **Use a recovery code** and enter one instead.

## Disabling or resetting 2FA

You can disable 2FA from **Account → Security** after re-authenticating. If you've lost both your device and your recovery codes, a workspace Admin cannot bypass your 2FA — contact your platform administrator, who can assist through the [platform admin](/docs/administration/platform-admin) tools.

## Related

- 2FA protects interactive logins; programmatic access uses [API Tokens](/docs/security/api-tokens).
- For organization-wide sign-in policies, see [SSO](/docs/security/sso).
