Orvio Studio 0.9.0 adds SEO Studio and desktop update notifications, with the latest Assistant experience.

- **SEO Studio:** connect Google Analytics 4 and Search Console with read-only Google sign-in. Discover accessible properties, compare 7/28/90-day reports, explore search queries and landing pages, review keyword opportunities, and export reports. Partial API failures preserve the working source's data.
- **AI SEO analyst:** ask questions about real loaded reports with your configured local or cloud model. Reports are sent to the selected AI provider only when you request analysis. Assistant and MCP can read the latest report summary.
- **Update notifications:** a native desktop notification when a release is available and another when an automatic download is ready. Clicking opens update settings. Notifications are deduplicated by version across restarts. Operating-system notification settings still apply.
- **Assistant:** an open, full-height white-theme canvas, integrated Chat/Work switch, rounded composer, collapsible history, microphone transcription, local read-aloud voices and text/code attachments. Images use supported vision-capable Gemini or OpenAI models; text-only local models show a compatibility message.

Google setup: enable Analytics Data API, Analytics Admin API and Search Console API, create a Desktop OAuth client, then import its JSON in SEO Studio. See [connection instructions](https://github.com/thisnaeem/orvio-studio/blob/main/docs/SEO-STUDIO.md). No paid SEO data subscription is required for these first-party reports. Competitor/backlink databases and global keyword-volume research are not included.

Validation: 123 Node tests passed, including new OAuth, report, notification and attachment checks. Production TypeScript/Vite build passed. Google responses were tested with fixtures; live account access and native notifications still need verification after Google connection and OS permission setup. The app and preview server were not launched during this work, as requested.

Windows x64 and macOS Apple Silicon/Intel packages include Python. Builds are unsigned. Windows supports automatic updates; unsigned macOS builds require downloading and installing the release manually.
