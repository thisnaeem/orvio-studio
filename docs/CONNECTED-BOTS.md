# Bot shortcuts and connected assistant

## Bot shortcuts

In **Your bots**, select **Create shortcut** under any bot. The location picker starts on the Desktop; choose any writable folder. The installed app creates a Windows `.lnk`, a macOS launcher `.app`, or a Linux `.desktop` file using that bot's avatar. Existing files are never overwritten. Shortcuts can be moved after creation. If Orvio itself is moved or removed, recreate the shortcuts.

A shortcut opens only its bot in a focused window without the main workspace sidebar. Reopening a shortcut focuses its existing window. Closing keeps it in the tray so ongoing tasks can continue. **Open workspace** opens the normal workspace separately. Shortcut creation is intentionally unavailable in a development build: installed launchers must not depend on a development server. Linux desktop environments may ask to mark a launcher as trusted.

## Composio

Open **Integrations → Connected apps**, . Add your Composio Connect (`ck_`) or Platform project API key, browse the live catalog, and connect apps through their hosted sign-in. Refresh connections after returning from the browser. Platform keys use a paginated toolkit catalog. Connect keys use the official `https://connect.composio.dev/mcp` endpoint with `x-consumer-api-key`; search an app by name to discover its tools and connection status. Connect account management opens the Composio dashboard. Availability, authorization methods and permissions depend on the provider and your Composio project.

This is a personal desktop integration: the user's own key is encrypted with Electron safeStorage and never exposed to the renderer or bundled into the release. Each installation gets a random user ID and reuses its session. App access tokens stay with Composio. Removing the key disables Orvio access on this device; disconnect individual apps to revoke their Composio connections. A commercial shared-key deployment needs a separate authenticated backend; do not embed a project secret in an installer.

The assistant searches for tools, fetches their schemas on demand, and prepares app actions. It shows the exact tool and arguments for approval inside chat before execution. Declined actions are not run. Raw Composio meta execution and sandbox tools are not exposed to the model. Execution requires a previously discovered app tool. Transport retries are disabled for app actions; an interrupted response is marked unconfirmed, since an external write may already have happened. Check the destination before repeating it.

## Assistant

The main sidebar automatically collapses on Assistant and Creative Studio and can be expanded using its toggle. The model picker inside chat lists installed local models and models returned by the configured provider. Choosing one affects chat requests and attachment capability checks without changing global AI settings. Work mode retains its coding-model selector and project harness.

Chat can chain up to ten tool rounds, reports tool progress, renders Markdown, and keeps the plus button dedicated to file and image attachments. Existing local publishing and media tools remain available alongside the connected-app tools. Model tool-use quality still depends on the chosen model.

## Verification and references

Build and automated tests cover model overrides, connector discovery/execution, encrypted storage, session reuse, declined approvals, ambiguous outcomes, shortcut file formats and routing IDs. Live OAuth and OS launcher clicks require testing in installed builds with real accounts; no app or development server was started during this change.

Implementation follows the official [Composio session quickstart](https://docs.composio.dev/docs/quickstart), [authentication guide](https://docs.composio.dev/docs/authentication), and [Electron shortcut API](https://www.electronjs.org/docs/latest/api/shell#shellwriteshortcutlinkshortcutpath-operation-options-windows). SDK version: `@composio/core` 0.22.0. Session keys and user state are stored in the application data directory, not this repository.

Connect MCP was verified live with the supplied consumer key: authenticated, listed the available MCP tools, and discovered five Gmail tools. No emails or other external writes were performed. The key was passed in memory to the diagnostic process and was not added to source files.
