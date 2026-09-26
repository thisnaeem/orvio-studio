# Orvio Studio MCP server

Orvio includes a local, read-only MCP server for compatible AI clients. It exposes `list_accounts`, `list_posts` and `publishing_status`. It never returns Meta or AI tokens. Publishing still requires an explicit action in Orvio's composer.

From a cloned Orvio Studio repository, install dependencies with `npm install`. In your MCP client's server configuration, set:

```json
{
  "mcpServers": {
    "orvio-studio": {
      "command": "node",
      "args": ["/absolute/path/to/orvio-studio/mcp/server.mjs"],
      "env": {"ORVIO_DATA_DIR": "/absolute/path/shown-in-orvio-integrations"}
    }
  }
}
```

Open **Integrations → Orvio MCP server** to see your local data directory. Replace both absolute paths above. On macOS the default is normally `~/Library/Application Support/orvio-studio`; on Windows it is normally `%APPDATA%\\orvio-studio`.

The MCP server reads the atomic workspace state file when each tool is called, so it reflects new accounts and jobs while Orvio is open. It requires access to the same OS user data directory as Orvio. Running the MCP server grants the configured local AI client access to your account names, publishing titles and schedule; configure only clients you trust. It has no tool to publish, delete or change credentials.
