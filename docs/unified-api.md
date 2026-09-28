# Orvio Unified API

Orvio runs its own authenticated HTTP gateway on `http://127.0.0.1:20129/v1`. It does not require an external routing application. Supported routes are `GET /models` and `POST /chat/completions`, including tool messages and streamed responses. Anthropic and native account adapters buffer responses before emitting compatible stream events.

## Connections

Use Settings → Unified API to choose a provider. Direct API connections store API keys using Electron safeStorage. Native account connections use a browser consent flow with PKCE, a random loopback callback, encrypted local tokens, and automatic refresh. Credentials never appear in renderer snapshots or the models endpoint.

Native browser login is implemented for OpenRouter and Gemini. OpenRouter uses its documented PKCE key exchange. Gemini requires a Google desktop OAuth client registered for Orvio, its client secret, and the appropriate project/API access. Google setup: https://ai.google.dev/gemini-api/docs/oauth. OpenRouter setup: https://openrouter.ai/docs/guides/overview/auth/oauth.

The Antigravity adapter implements direct model discovery and text/tool request translation. It is experimental and has not been verified against a live account. It requires an OAuth client approved for this service and an authorized project; an arbitrary Google client is not guaranteed to have access. Orvio does not embed another application's private client credentials or pretend to be an official client.

Other subscription adapters that are not implemented are labeled Not implemented. The provider directory is not a claim that every listed service supports native login. Direct endpoint compatibility and account access remain subject to the service's API requirements.

## Models and routing

Saving an account starts model discovery. Refresh all models updates enabled connections, and API catalog requests refresh caches older than five minutes. Failed refreshes preserve the previous catalog and report a connection error. Additional model IDs can be entered for API providers without discovery.

Discovered models publish automatically in Orvio's API. Matching IDs across accounts share fallback routes. Named routes support ordered fallback or round-robin. Use in Work & Chat selects a model for Orvio's assistant.

Legacy relay presets were removed. Saved preset connections to the former relay port are disabled and marked for direct reconnection; they are not silently used or translated into a different account.

## Validation and limits

Production build and 103 Node tests passed. Tests cover PKCE state validation, cancellation, encrypted token persistence, concurrent token refresh, native-account model publishing and routing, Antigravity text/tool conversion, API authentication, SSE output, fallback, and discovery pagination. OAuth tests use controlled provider responses; successful live consent and inference have not been verified for the new native adapters.

Restart the Electron process after updating backend modules. A renderer refresh alone does not reload them.

Logo and historical metadata attribution is retained in `public/providers/NOTICE.txt`; attribution is not a runtime dependency.
