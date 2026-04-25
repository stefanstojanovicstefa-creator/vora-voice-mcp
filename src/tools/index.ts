import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerVoraRegister } from "./vora-register.js";
import { registerVoraCreateAgent } from "./vora-create-agent.js";
import { registerVoraCall } from "./vora-call.js";
import { registerVoraCalls } from "./vora-calls.js";
import { registerVoraUpdateAgent } from "./vora-update-agent.js";

export function registerTools(server: McpServer): void {
  registerVoraRegister(server);
  registerVoraCreateAgent(server);
  registerVoraCall(server);
  registerVoraCalls(server);
  registerVoraUpdateAgent(server);
}
