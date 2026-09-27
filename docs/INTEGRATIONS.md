# Integrations and publishing

Orvio Studio is free. No hosted connection or billing service is required.

## Meta Graph API

1. Use a Facebook Page you manage. For Instagram, link a Business or Creator account to that Page.
2. Configure your Meta developer app for Instagram API with Facebook Login. Use Meta Graph API Explorer with **your app** to obtain a Facebook user access token. Request `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic` and `instagram_content_publish` as needed for your destinations.
3. In Orvio → Instagram → Connect pages, enter the token and supported Graph version (the UI starts with `v24.0`). Orvio discovers all Pages and their linked Instagram professional accounts. Available pictures, follower counts and media counts appear on profile cards.
4. Prefer a long-lived token through Meta's documented lifecycle. Orvio does not request your app secret or automatically exchange/refresh the token. Reconnect when permissions or token status change. Meta app review, advanced access and business verification may be required for accounts outside developer/test roles.

Meta's `/me/accounts`, `/{ig-id}/media`, `/{ig-id}/media_publish`, `/{page-id}/photos` and `/{page-id}/videos` APIs provide the account and publishing operations. Instagram images use JPEG delivery URLs; videos publish as Reels. Facebook Pages support direct binary photo uploads from your computer and hosted videos. Meta [retired official third party Facebook Groups publishing](https://developers.facebook.com/blog/post/2024/01/23/introducing-facebook-graph-and-marketing-api-v19/); the app does not claim to automate Groups.

[Meta Instagram Graph collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) · [Meta Facebook API collection](https://www.postman.com/meta/facebook/overview)

## Uploading files from your PC

Facebook Page JPG and PNG photos up to 10 MB upload directly to Meta and do not need Cloudinary or a public URL. For Instagram local media and Facebook Page videos, open Settings → Media hosting, enter your Cloudinary cloud name and an **unsigned upload preset**. Find the cloud name on your [Cloudinary console](https://console.cloudinary.com/) dashboard; create an unsigned preset under Settings → Upload → Upload presets. Enter only these two names. The connector uploads a selected JPG, PNG, MP4 or MOV (under 100 MB) to Cloudinary with a streaming file blob, then uses its public HTTPS delivery URL for Meta. PNGs use Cloudinary JPEG delivery for Instagram. Cloudinary is optional if your image or video is already hosted publicly. Keep the asset available until Meta finishes publishing. Your Cloudinary account's quota and terms apply; Orvio itself is free.

The connector has no Cloudinary API secret. Choose a preset with limits appropriate to your own account; anyone with its cloud name and preset could otherwise upload to it. Orvio checks the returned host and cloud path before saving the URL. Selecting a local file for Instagram or a Page video transmits it to your Cloudinary account. Selecting a Page photo copies it into Orvio’s private app data until publishing, then sends it directly to Meta.

## Calendar and background publishing

Open Automations → Schedule post. Choose a connected Instagram profile or Facebook Page, select a local file or public HTTPS URL, enter a caption, then publish now or choose a local date/time. The calendar and job list show queued, processing, published, failed and uncertain states. The worker checks every 30 seconds and on wake; “Publish now” starts it immediately.

Closing the window leaves Orvio in the tray. The tray menu can reopen or quit it; Settings can enable start at login and pause publishing. The computer must remain awake, online and running the app. Missed queued posts run after it resumes. Queued posts can be cancelled. Once a request has been submitted to Meta, it cannot be recalled. If the response is lost, Orvio marks the job uncertain and will not automatically repeat it; check the destination first.

## AI and chat

Settings → AI models:

- **OpenAI / compatible endpoint:** use a Chat Completions base URL and optional key. Refresh to discover available models. OpenAI's base URL is `https://api.openai.com/v1`.
- **Google Gemini:** enter a Gemini API key and choose an automatically discovered text generation model. Orvio uses Google's `generateContent` endpoint.
- **Ollama local:** run Ollama and pull a model, then select Ollama to discover installed models automatically. Orvio uses `http://127.0.0.1:11434/v1/chat/completions` and needs no cloud API key.

The chat offers Studio assistant, Caption writer and Content strategist, with searchable local conversation history. The plus menu opens the post composer, calendar, Meta connection and Google Drive within chat. The AI has a tool harness that can read connected accounts, publishing jobs and Orvio Drive files, and can prepare a post for review in the chat composer. The user confirms the final post there; AI text alone never publishes. Chat uses Gemini function calling or OpenAI-compatible tool calls when supported by the selected model. Conversations are stored locally in app storage. AI requests are sent only when you click Generate or Send. Remote provider usage may cost money and generated text should be reviewed.

[OpenAI API guide](https://developers.openai.com/api/docs/guides/migrate-to-responses) · [Gemini generateContent](https://ai.google.dev/api/generate-content) · [Ollama compatibility](https://ollama.com/blog/openai-compatibility)

## Google Drive

The Google Drive connector uses [Google’s Desktop OAuth flow with PKCE](https://developers.google.com/identity/protocols/oauth2/native-app) in the system browser. Enable the Drive API in a Google Cloud project and create an OAuth **Desktop app** client ID. Enter that ID in Integrations or Chat → Google Drive; no Google password or client secret goes into Orvio. The app asks for the narrow `drive.file` scope, so it can list and manage files you add through Orvio, not every pre-existing Drive file. Refresh tokens are encrypted by the operating system. You can upload files under 25 MB, view them, refresh the list, and disconnect. Google may require OAuth consent-screen setup or verification for people outside your test users.

## MCP

The included [read-only MCP server](MCP.md) exposes profile metadata and publishing jobs to compatible local clients without credentials. It never publishes automatically.

## Built-in model library (0.6)

Models contains Chat, Image, Video and Voice tabs, with installed filters, hardware recommendations and benchmarks. The built-in engines manage inference without a separate Ollama or ComfyUI installation. Existing external AI provider connections remain usable.

Chat uses checksum-verified llama.cpp b11146 binaries. Curated Qwen GGUF models can be downloaded, or compatible GGUF files imported. Online discovery searches public Hugging Face GGUF repositories and offers single-file weights, validating available filenames through the provider API. Repository-specific architectures are not universally supported. On Windows this release uses the CPU engine; Apple Silicon can use Metal. The internal chat service binds only to loopback, requires a random session key and unloads after two idle minutes.

Image Studio uses Diffusers directly with SD Turbo or SD 1.5 at 512 × 512. Video Studio uses AnimateDiff Lightning with an SD 1.5 base for 16-frame, 8-fps animations. CUDA is used only when the installed Torch runtime supports the GPU; otherwise Apple Metal or CPU is selected. This is local prompt-to-video generation, separate from clipping/recording existing video. Image and video pipelines are curated; importing arbitrary checkpoints or custom Python is not supported.

The hardware panel detects CPU, logical cores, system RAM and graphics adapters. Apple shared memory is labeled as shared, not invented dedicated VRAM. NVIDIA VRAM is read when its driver utility is available; unknown memory remains unknown. Recommendations describe memory estimates and engine constraints. Benchmark runs a real short generation and saves wall-clock time including startup, plus chat token speed when the engine provides it. Benchmark results reflect that specific model/test and current device load.

The top-bar transfer drawer tracks model weights, dependencies, videos and app update downloads. It shows real per-file byte progress, speed and estimated time when totals are available. Setup and conversion show an indeterminate state; percentages are never invented for unknown totals. Download buttons become progress controls. Up to three model downloads run concurrently, with additional requests queued and individually cancellable. Engine installation is locked per environment to avoid concurrent package writes. Download history survives restart; interrupted transfers are marked accordingly. Chat weights keep partial files for range-based retry. Generation remains serialized to limit memory use.

## Local voice, downloader and clipping (0.5)

The installed application includes a checksum-verified CPython 3.11 runtime for Windows x64 and macOS Intel/Apple Silicon. Developers prepare their native runtime using `npm run runtime:prepare`. Each local engine gets an isolated environment; the app creates it and installs pinned dependencies on first download. No system Python is used. Generation runs one task at a time; up to three model downloads run concurrently, with individual cancellation. Output files and downloaded model weights stay in the app's local data folder until exported.

Voice Studio offers 15 Piper voices across 14 languages (English US/UK, Arabic, Hindi, Spanish, French, German, Russian, Italian, Portuguese, Turkish, Chinese, Dutch, Polish and Swedish) and Chatterbox multilingual cloning (23 languages, Windows and Apple Silicon). Users choose a reference recording and confirm permission to use it. The Chatterbox watermark is preserved. CPU generation can be slow. Consult `runtime/THIRD-PARTY.md` and the linked model cards for licenses.

The general downloader now uses yt-dlp and accepts supported public video links without connecting a Meta account. The earlier Graph API downloader remains a fallback for non-desktop callers. Downloads are normalized to MP4 using FFmpeg. Private, DRM or login-protected sources may fail; there is no promise of support for every site. No browser cookies are read automatically. Users may explicitly select their own exported Netscape-format session file. Its contents remain in memory until quit; a private temporary file is created only during a download and removed afterward. Leftover temporary session files are removed on the next launch after a crash.

Clipping Studio imports or downloads video, transcribes with Whisper Tiny on-device, and sends the transcript to the configured AI provider only when Find highlights is clicked. Suggested ranges are validated, editable and exportable in original or fitted 9:16 format. Manual clipping works without a configured AI provider. Video clips can be handed to the existing posting composer; Instagram and Facebook video publishing currently use the configured Cloudinary media connector. The publisher's 100 MB upload limit still applies.
