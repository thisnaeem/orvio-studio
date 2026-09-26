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

The chat offers Studio assistant, Caption writer and Content strategist. Chat can use current account names and upcoming job titles as context. Type `/schedule`, `/connect` or `/calendar` to open a tool. Publishing always requires the composer; chat text alone does not publish. Conversations are stored locally in the app's browser storage. AI requests are sent only when you click Generate or Send. Remote provider usage may cost money and generated text should be reviewed.

[OpenAI API guide](https://developers.openai.com/api/docs/guides/migrate-to-responses) · [Gemini generateContent](https://ai.google.dev/api/generate-content) · [Ollama compatibility](https://ollama.com/blog/openai-compatibility)

## MCP

The included [read-only MCP server](MCP.md) exposes profile metadata and publishing jobs to compatible local clients without credentials. It never publishes automatically.
