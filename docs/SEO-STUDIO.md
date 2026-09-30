# SEO Studio

Orvio connects directly to Google Analytics 4 and Google Search Console with read-only scopes. No Orvio billing or hosted connection service is required.

## Connect Google

1. In [Google Cloud](https://console.cloud.google.com/apis/credentials), select a project. Enable **Google Analytics Data API**, **Google Analytics Admin API** and **Google Search Console API**.
2. Configure the OAuth consent screen. For an External app in Testing, add the Google account you will sign in with as a test user. Google can expire refresh tokens for testing apps; reconnect when asked.
3. Create an OAuth client with application type **Desktop app**, then download its JSON file.
4. Open **All tools → SEO → Connection**, import that JSON, and click **Connect Google**. Approve the Analytics and Search Console read permissions in your browser.
5. Select the Analytics property and Search Console site. Either connector can be used on its own. Click **Load report**. The Google account must already have access to those properties.

The desktop app uses PKCE, a random state and a short-lived localhost callback. Client credentials and refresh tokens are encrypted with the operating system's credential storage. Sign-in closes its listener after completion, cancellation or timeout. Credentials are never sent to an AI model, exposed to the renderer, included in exports, or returned by the MCP tool. Disconnect clears Orvio's access and reports; Google account settings provide server-side access revocation.

## Reports and analysis

Choose 7, 28 or 90 days. Reports end three days ago, with an equally long previous period, to avoid presenting unfinished Search Console data as final.

- **Overview:** Separate Analytics and Search Console cards, service icons, source labels and website favicons. Analytics website addresses come from the property's web data streams; Search Console uses the selected site. Favicons load directly from that website's `/favicon.ico`, without a third-party favicon provider, with a fallback icon.
- **Analytics:** Users, sessions, engagement and key events with period comparisons; selectable daily charts; channel, device and country breakdowns; the top 50 landing pages.
- **Search Console:** Clicks, impressions, CTR and average position with period comparisons. Filter and sort up to 200 queries or 100 pages, including matched-row click changes. Device/country breakdowns are separate from GA4's statistics. Missing previous top rows are unknown, not zero.
- **Opportunities:** Queries with at least 100 impressions and average position 4–20, with shortcuts to content briefs and title/description suggestions. These are heuristics, not ranking guarantees.
- **AI workspace:** Performance review, quick wins, content briefs, metadata drafts and a technical review checklist. A bounded report sample goes to the configured model only when requested. Selected query/page evidence is prioritized. Structured responses distinguish evidence, interpretations, actions, drafts and missing information; Markdown responses are formatted safely. Truncated JSON does not replace a previous good review. A technical checklist is not a website crawl.
- **Action plan:** Add suggested actions, track completion and remove tasks. Plans persist across report refreshes and are scoped to the selected property/site. Disconnect clears them. Actions do not change your website automatically.
- **Export:** Report, AI review and the selected website's action plan as JSON through a Save dialog.
- **Assistant and MCP:** `seo_report` reads the latest loaded summary, dates and opportunities without credentials. It does not change Google data or silently fetch a new report.

Google Analytics uses the property's timezone; Search Console dates use Pacific Time. Clicks and sessions are not equivalent. Search Console may omit anonymized queries and does not guarantee all rows. Privacy thresholds, attribution and reporting lag can affect totals. Orvio displays partial-source errors and keeps the successful source usable.

This implementation uses first-party Google reports. It does not claim competitor traffic estimates, a backlink index, global keyword volumes, live SERP tracking, a crawl audit, or rank guarantees. Those would require additional data sources and separate features.

## Research and API references

- [OpenSEO](https://github.com/every-app/open-seo): reviewed its report/research workflow as product inspiration. Orvio's implementation is independent; OpenSEO is not embedded.
- [Google native application OAuth](https://developers.google.com/identity/protocols/oauth2/native-app): desktop loopback redirects and PKCE.
- [Analytics account summaries](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list): discover accessible GA4 properties.
- [GA4 runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport): dimensions, metrics, date ranges and read-only authorization.
- [Search Console sites](https://developers.google.com/webmaster-tools/v1/sites/list): discover verified properties.
- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): final web-search rows, dates and reporting limitations.

Tests exercise OAuth state/PKCE, encrypted persistence, report parsing, date comparisons, partial failures and bounded AI analysis with mocked Google responses. Live Google account access requires the user's OAuth configuration and has not been tested in this development environment.

Optional breakdown failures preserve source totals and report which detail could not load. GA4 and Search Console selections can refer to different websites; verify your selections before comparing them.

- [GA4 reporting schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema): metrics and device/country dimensions.
- [GA4 web streams](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list): website addresses for property labels and favicons.
