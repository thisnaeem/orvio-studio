# Orvio Studio

A free Electron studio for Instagram, Facebook, TikTok and YouTube publishing. The app includes Unbounded typography, Hugeicons Free, a generated PNG brand mark, onboarding, customizable appearance, an integrated calendar and AI chat.

## Run and build

Node.js 22.12+ and npm are required.

```sh
npm install
npm run desktop
npm test
npm run release:build
node scripts/verify-release.cjs
```

Browser preview: `npm run dev` at http://127.0.0.1:5188. Connections, encrypted settings and background publishing require the Electron app.

## Features

- Free tools with no subscription or checkout.
- Connect Facebook Pages and linked Instagram professional profiles through Meta Graph API. View profile pictures and available counts.
- Compose text, images or videos with automatic post names and selectable vision AI captions. Post immediately or use a custom calendar and bulk scheduling across multiple channels. Instagram and Facebook videos publish as Reels.
- Import media from your computer into a durable local queue, or use a public media URL. Instagram local uploads use Cloudinary; Facebook, TikTok video and YouTube support direct local uploads. Track history, post details, live links and last-published account activity.
- Close to tray, pause/resume automations, optional start at login, single-instance handling and custom desktop window controls.
- Three chat agents for studio help, captions and content strategy; use `/schedule`, `/connect` and `/calendar` to open tools from chat. AI providers: Gemini, OpenAI-compatible endpoints and local Ollama.
- Read-only MCP server exposing connected profiles, publishing jobs and pause state to compatible local clients.
- Windows installer/executable/shortcut icons and automatic updates. Unsigned macOS releases check for updates and offer a manual download.

Meta retired the official Facebook Groups publishing API, so Orvio does not auto-post to Groups. Other limits: the computer must be awake, online and running Orvio; Meta permissions and account eligibility apply; AI provider usage may cost money. Live Meta, Cloudinary and AI calls need your own credentials. Automated tests use simulated provider responses.

See [social publishing and channel setup](docs/SOCIAL-PUBLISHING.md), [integration setup](docs/INTEGRATIONS.md), [MCP setup](docs/MCP.md) and [release operation](docs/RELEASES.md).

## Security and data

Meta tokens and AI keys are encrypted with Electron safeStorage, stored under the app's user-data directory, and excluded from renderer responses. Account metadata, jobs and AI configuration are stored in `workspace-v3.json` with atomic writes; appearance, drafts and chat history use versioned localStorage. Credentials are bound to the original OS user. The renderer uses sandboxing, context isolation, narrow IPC, restricted navigation and a content security policy. Credentialed network calls run in the main process with timeouts and redirect rejection.

## Extending the studio

Register new tools in `src/tools.ts` and add their routes. The source brand image is `public/orvio-logo.png`; the generation prompt is in [docs/LOGO.md](docs/LOGO.md). Windows uses a seven-size ICO at `build/icon.ico`.
