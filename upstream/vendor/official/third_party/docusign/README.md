# Docusign

Cursor plugin that connects agents to [Docusign](https://www.docusign.com) through Docusign's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server (beta).

Work with eSignature envelopes and templates, Maestro workflows, and Navigator agreement data from the signed-in Docusign account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Docusign**.
3. Click **Install**, then set the Integration Key and Secret Key (below) and complete the Docusign sign-in prompt.

Or run `/add-plugin docusign` in chat.

## MCP

```json
{
  "mcpServers": {
    "docusign": {
      "type": "http",
      "url": "https://mcp.docusign.com/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

## Setup

Docusign MCP requires a confidential OAuth app (Authorization Code Grant). Create an Integration Key before anyone can connect.

1. Sign in to your [Docusign account](https://www.docusign.com/) (or [developer account](https://developers.docusign.com/)) and open **Settings → Apps and Keys**.
2. Add an app, copy the **Integration Key**, and generate a **Secret Key**.
3. Register both redirect URIs on that app:
   - Desktop: `http://localhost:8787/callback`
   - Web and Cloud Agents: `https://www.cursor.com/agents/mcp/oauth/callback`
4. In **Dashboard → Plugins → Configure**, set **Docusign Integration Key** and **Docusign Secret Key** from that app.
5. Complete the Docusign OAuth login when Cursor prompts.

On a team marketplace an admin can set the credentials once for everyone; each member still completes their own Docusign OAuth login, so tool calls run with that member's permissions.

## Demo vs production

This plugin points at the production MCP URL. For developer/demo accounts, change the `url` in `mcp.json` to `https://mcp-d.docusign.com/mcp` after install.

| Environment | URL |
| --- | --- |
| Production (default) | `https://mcp.docusign.com/mcp` |
| Demo (developer accounts) | `https://mcp-d.docusign.com/mcp` |

## Notes

- The MCP server is in beta. Expect changes as Docusign adds tools and refines the surface.
- Only **Confidential Authorization Code Grant** tokens are supported — not JWT, Implicit, or Public Authorization Code Grant.

## Docs

- Docusign MCP server (beta): https://developers.docusign.com/platform/mcp-server/
- Confidential Authorization Code Grant: https://developers.docusign.com/platform/auth/confidential-authcode-get-token

Logo is Docusign's developer-center app icon (192×192) from https://developers.docusign.com/.

## License

MIT
