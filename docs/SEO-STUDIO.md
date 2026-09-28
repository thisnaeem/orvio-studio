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

- **Overview:** Search clicks, impressions, CTR, average position and daily clicks; GA4 active users, sessions, engagement rate and key events; traffic channels.
- **Keywords:** Searchable/sortable top 200 query rows; review opportunities with at least 100 impressions and average position 4–20. Low-CTR suggestions are heuristics, not ranking guarantees.
- **Pages:** Top 100 Search Console pages and top 50 GA4 landing pages.
- **AI analyst:** Questions about the loaded report. The model receives totals and a bounded sample of queries/pages only after Analyze is clicked. Uses the AI model configured in Settings; local models keep inference on the device, while a cloud configuration sends the sample to that provider. Responses should distinguish evidence from hypotheses.
- **Export:** JSON report and any saved AI analysis through a Save dialog.
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
