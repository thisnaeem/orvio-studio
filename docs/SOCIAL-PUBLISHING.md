# Social publishing

The Publishing and Connections screens share one account, media and job store. The workflow was informed by [AutoSocial](https://github.com/Katzca/AutoSocial): multiple accounts, per-account queues, immediate posting, scheduled posting and bulk preparation. Orvio uses official platform APIs; AutoSocial's browser upload sessions, cron daemon, profile watching and video uniquifier are not embedded in Orvio.

## Create and schedule

Choose Create post / bulk queue. Add up to 50 files in one selection, select one or several accounts, and edit each caption from its thumbnail. There is no required post title: AI supplies a label, or Orvio derives one from the caption or filename.

With caption AI configured, Auto-write captions inspects each selected image or three video frames. The composer lets you choose an available vision model from the configured provider without changing the global model. Gemini, Claude and supported OpenAI models use actual image payloads. Text-only local models can write from a brief but cannot inspect media. Review captions before sending.

Post now sends the batch to the queue immediately. Schedule uses a custom month picker, Today/Tomorrow/Next week shortcuts, local time and time presets. Bulk schedules can use daily slots or 30-, 60- or 120-minute intervals. Every destination receives the same caption for a given item. At most 100 destination/post combinations can be queued in one batch. The complete batch is validated before any job is saved.

Files are copied into app-owned storage before scheduling, so moving or deleting the original does not break the queue. Preview files remain available for publishing history. Scheduled jobs need Orvio awake and online. Pausing the queue pauses immediate and scheduled posts alike.

## Channels and setup

| Channel | Content | Connection and media requirements |
| --- | --- | --- |
| Instagram | Images, Reels | Linked professional account, Meta token; local media uses Cloudinary, or a public HTTPS URL. Local media up to 100 MB. |
| Facebook Page | Text, photos, Reels | Meta Page access. JPG/PNG photos up to 10 MB upload directly. MP4/MOV videos use the Reels start/upload/finish workflow, with local files or a public URL. |
| TikTok | Videos, photos | Content Posting API token with `user.info.basic` and `video.publish`; local MP4/MOV video up to 64 MB, or a URL from a TikTok-verified domain. Photos require verified public URLs. Privacy comes from the account's creator information; app review can restrict visibility. |
| YouTube | Videos, eligible Shorts | Google OAuth token with `youtube.upload` and `youtube.readonly`; local video up to 500 MB. Choose visibility and made-for-kids classification. YouTube determines whether an eligible video is a Short. |

Connect from Connections → Add channel. Credentials are encrypted using Electron safeStorage and excluded from renderer and MCP responses. Tokens are supplied from your own platform app; this feature does not ship a shared developer application or a browser-session login.

For TikTok and YouTube, enable **Keep schedules connected automatically** and supply the refresh token and client credentials belonging to the app that issued it. Access and refresh tokens rotate in the main process. Without refresh credentials, reconnect before the short-lived access token expires. Meta continues to use its existing long-lived-token workflow.

Official references: [Meta Reels publishing](https://developers.facebook.com/docs/video-api/guides/reels-publishing/), [TikTok Direct Post](https://developers.tiktok.com/docs/content-posting-api-get-started), [YouTube resumable uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol).

## History and account details

Publishing has Queue, Calendar, History, Needs attention and All posts views, with search and platform/status filters. Select a post to inspect its media, full caption, destination, visibility, created/scheduled/published timestamps, platform ID and live link when returned by the platform. Queued posts can be edited or cancelled. Account cards show queued/published counts and the last time Orvio published to that account; selecting a card opens recent activity and post details. Activity is for posts made through Orvio, not an imported history of every platform post.

A successful queue submission is not reported as a successful publication. Instagram containers, Facebook Reels, TikTok publish IDs and YouTube processing are checked separately. Interrupted requests with an ambiguous result are never blindly replayed. TikTok/private posts may not receive a public permalink. Older Meta jobs can resolve their live link when their details are opened.

## Verify without publishing

Run `npm run dev`, then open `/scripts/social-preview.html` on the development server. This isolated fixture demonstrates channels, bulk media, AI captions, scheduling and history with sample data and simulated publishing. It does not connect to social platforms or use real credentials.

The Node tests cover platform request formats, atomic bulk validation, durable local media, multimodal AI payloads, refresh-token encryption, permalink storage and interrupted-upload recovery. Live posting still needs verification with eligible real accounts and credentials.
