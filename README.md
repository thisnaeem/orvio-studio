# Orvio Studio

A multi-tool Electron workspace with a clean start. Self-hosted Unbounded typography, Hugeicons Free, a generated PNG app mark, a refreshed splash, first-launch onboarding, and persistent customization.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run desktop
```

Browser preview: `npm run dev` → http://127.0.0.1:5188. Production build: `npm run build`. Tests: `npm test`. Installers: `npm run release:build` (macOS arm64/x64 and Windows x64). See [release and update operation](docs/RELEASES.md) for unsigned-build limitations.

## Workspace

- Home launcher and searchable tool collection. Add new tools through `src/tools.ts` and implement their route.
- First-launch tour: name/workspace, theme/accent/spacing, ready screen. Reopen from Settings.
- Light, dark, and OS-synced appearance; Sunset, Iris, and Evergreen accent colors; comfortable/compact spacing. Preferences save automatically.
- Instagram connection screen with honest empty states. No seeded accounts, metrics, sample posts, charts, or conversations.
- Local drafts: create, edit, delete, persist. No fabricated publishing success.
- Local comment-to-message workflow configurations, saved inactive until a service is connected.
- A $9.99 USD/month Studio Pro screen and configurable Paddle checkout entry point.
- Sandboxed Electron renderer, context isolation, narrow IPC, allowlisted external URLs, content security policy, and configured-release update lifecycle.

## Integrations

Server-only helpers in `services/` provide Meta account discovery/image publishing and Paddle transaction creation/webhook verification/entitlement derivation. They are excluded from desktop packaging and tested with mocks.

Live account synchronization, publishing queues, messaging activation, billing enforcement, and OAuth require an authenticated hosted service with your Meta/Paddle credentials. The public GitHub update feed is configured. Windows automatic updates are implemented; unsigned macOS builds check for releases and offer a manual download. Signed/notarized macOS distribution is still needed for automatic installation. See [integration setup](docs/INTEGRATIONS.md). No real publishing or payments have been performed.

## Branding and assets

The generated raster mark is `public/orvio-logo.png`; [the exact image-generation prompt](docs/LOGO.md) is saved with the project. Unbounded is bundled through `@fontsource-variable/unbounded` so fonts work offline. All UI icons use `@hugeicons/react` and `@hugeicons/core-free-icons`. No remote photography or dummy content is loaded. The old SVG logo and Lucide dependency have been removed.

Workspace data uses versioned localStorage keys. The first 0.2.0 launch clears the legacy demo posts/rules/theme keys to start fresh; new drafts, workflows and preferences persist under `orvio.v2.*`.
