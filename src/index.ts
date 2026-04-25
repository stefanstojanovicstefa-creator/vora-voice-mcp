import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "vora-voice",
  version: "0.1.0",
  description:
    "Voice, ears, and brain for autonomous AI agents. Make phone calls, close deals, book meetings.",
});

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vora Voice MCP server running on stdio");
}

main().catch(console.error);
