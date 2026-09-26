# Production integration handoff

## Service boundary

`ORVIO_SERVICE_URL` is a trusted HTTPS origin read by Electron's main process. Its `/connect/meta` and `/billing/checkout` routes open in the system browser. These routes must authenticate the workspace owner. They are contracts for your hosted service, not implemented public endpoints in this repository. Do not put provider secrets, service admin credentials, or Page access tokens in renderer code, environment variables prefixed VITE_, localStorage, or checkout URLs.

Add authenticated account/session synchronization before populating the empty account screens. The `services/` helpers are server-only and excluded from the packaged desktop app.

## Instagram through Facebook

1. Create your Meta app, configure Facebook Login with an HTTPS callback, select a supported API version, and complete required app review/permissions for your intended features.
2. Implement OAuth authorization and code exchange in the service. Bind single-use expiring state to the authenticated workspace session. Store/refresh tokens encrypted on the server; support revocation and data deletion.
3. Instagram Business/Creator accounts must be linked to Facebook Pages for this integration. Use the server-only `graphClient().listAccounts()` to enumerate eligible accounts. Verify ownership on every request.
4. Publishing requires approved publishing permissions. Use `createImageContainer`, poll `containerStatus` until FINISHED, then call `publishContainer`. Save container IDs and publishing outcomes; reconcile uncertain responses before retrying so a timeout does not duplicate a post.
5. Persist scheduled posts in a durable worker queue. Validate media constraints, account access, subscription, timezone, limits, and token expiry. Local drafts are not this queue.
6. Messaging rules require separate reviewed messaging permissions, verified Meta webhooks, webhook deduplication, allowed reply windows and event-specific checks. Do not treat a saved keyword configuration as permission to message arbitrary users. Implement the event processor before enabling live rules.

Official guide: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/

## Paddle: $9.99 USD monthly

1. Start in Paddle sandbox. Create Studio Pro with unit price `999`, currency `USD`, billing cycle `month`, frequency `1`. Configure your approved default payment link. Taxes are calculated/displayed by checkout.
2. On your authenticated `/billing/checkout` route, call `createCheckout` with a server-owned workspace ID, API key and Studio Pro price ID. Redirect to the returned checkout URL. Default sandbox mode must only be disabled deliberately for production.
3. Receive raw request bytes on the webhook route, enforce a request-size limit, and call `verifyPaddleWebhook`. Never parse/reformat JSON before verifying.
4. Persist event IDs for deduplication and `occurred_at` for ordering in a transaction. Associate subscription/customer IDs with the workspace established during checkout. Do not grant access from an unverified client event or arbitrary custom data.
5. Use `subscriptionState` with the configured price ID; update active, canceled, paused and past-due states. Provide Paddle customer-portal cancellation and payment-management links from an authenticated service route.
6. Enforce entitlement on the service for paid publishing/automation operations, and synchronize subscription status to the desktop client.

Docs: https://developer.paddle.com/get-started/quickstart/ and https://developer.paddle.com/webhooks/about/signature-verification/

## Desktop releases and updates

GitHub Releases is configured for `thisnaeem/orvio-studio`. Packaged builds check at startup and every four hours. Windows downloads/install updates through NSIS; unsigned macOS builds offer a manual release link. No `ORVIO_UPDATES_ENABLED` setting is needed. See [release operation](RELEASES.md) for signing requirements, artifact publication, and verification limits.

Guide: https://www.electron.build/docs/features/auto-update/
