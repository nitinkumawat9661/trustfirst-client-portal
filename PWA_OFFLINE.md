# PWA Offline Foundation

## Scope

The PWA foundation makes TrustFirst installable and prepares the Hardware ERP module for offline-first workflows. This sprint does not add a native mobile app, offline file sync, live payment gateway behavior, or service-worker caching logic.

## PWA Assets

- App manifest is exposed through the Next.js App Router manifest convention.
- Placeholder app icons live under `apps/web/public/icons`.
- The app declares standalone display, portrait orientation, theme color, and a hardware dashboard start URL.
- `/offline` provides a user-facing fallback page for offline mode.
- The update available UI is event-driven through `trustfirst:pwa-update-available` so a future deployment or service-worker strategy can trigger it without coupling UI to an implementation.

## Offline UI

The admin shell includes:

- Offline banner when the browser reports network loss.
- Sync status indicator.
- Pending actions panel.
- Failed actions panel.
- Manual retry and clear controls for failed actions.

## Boundaries

No secrets, session values, passwords, tokens, cookies, file objects, streams, or binary payloads are stored locally. The queue stores only sanitized mutation payloads and idempotency metadata.

## Future Work

A future sprint can add a production service worker for asset caching and offline navigation. That work should use the same queue contracts and must not become the source of authorization decisions.
