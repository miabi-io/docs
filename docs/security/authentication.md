---
sidebar_position: 1
title: Authentication
description: Registration, login, password reset, JWT sessions, and Redis-backed token revocation in Miabi.
---

# Authentication

Miabi authenticates users with a straightforward account model and stateless **JWT sessions** backed by a Redis revocation list. This page covers how accounts and sessions work in the web console.

![Login](/img/screenshots/login.png)

## Registration

New users sign up with an email address and password, and are assigned a unique **username** (a lowercase handle derived from the email, editable on the profile page). After registering, each user automatically receives a **personal workspace** to start working in immediately. Users can later be invited into shared workspaces — see [Members & Invitations](/docs/workspaces/members-and-invitations).

## Login

Sign in with **your email address *or* your username**, plus your password. If [two-factor authentication](/docs/security/two-factor-auth) is enabled on your account, you'll be prompted for a TOTP code after your password is verified. Organizations can also offer [single sign-on](/docs/security/sso) for OAuth2/OIDC providers.

Your username is also the directory-friendly handle Miabi keys off for the built-in [container registry](/docs/registry/overview) — `docker login` accepts either your workspace name or your username.

## Password reset

If you forget your password, choose **Forgot password** on the login screen. Miabi emails a single-use, time-limited reset link. Following it lets you set a new password; existing sessions can be invalidated as part of the reset.

## JWT sessions

A successful login issues a **JWT** (JSON Web Token) that represents your session. The token is signed by the server and carries your identity and a unique token ID (`jti`). Because JWTs are stateless, Miabi can verify a session without a database lookup on every request.

## Redis-backed revocation

Stateless tokens normally can't be "logged out" before they expire. Miabi solves this with a **Redis-backed revocation list**:

- When you **log out**, the token's `jti` is added to a blacklist in Redis.
- Every authenticated request checks the blacklist; a blacklisted token is rejected immediately.
- The blacklist entry lives only as long as the token's remaining lifetime, then expires automatically.

This gives you the performance of stateless JWTs with the safety of instant, server-side logout and revocation.

:::tip
Revoke sessions across all your devices by triggering a password reset or signing out everywhere — both blacklist the affected tokens.
:::

## Related

- Programmatic access uses [API tokens](/docs/security/api-tokens), not session JWTs.
- Strengthen accounts with [Two-Factor Authentication](/docs/security/two-factor-auth).
- Enable provider sign-in with [SSO](/docs/security/sso).
