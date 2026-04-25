import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getApiClient } from "../api-client.js";

interface CreateAgentResponse {
  agent_id: string;
  name: string;
  objective: string;
  workflow: string;
  language: string;
  voice_preview_url: string;
  estimated_cost_per_call: string;
  context_sources: string[];
}

export function registerVoraCreateAgent(server: McpServer): void {
  server.tool(
    "vora_create_agent",
    `Create a persistent voice agent for a specific use case. Uses your account context (from vora_register) plus any additional details you provide.

The voice agent persists across calls and improves with every conversation it has. Vora automatically:
- Compiles product knowledge from your website and registration context
- Generates objection handling based on your industry
- Selects the optimal voice, language, and speaking style
- Builds a conversation workflow (cold call, appointment, follow-up, etc.)

You can create multiple voice agents under one account for different use cases.`,
    {
      account_id: z
        .string()
        .describe("Your Vora account ID from vora_register."),
      objective: z
        .string()
        .describe(
          "What this voice agent does. Be specific. E.g., 'Cold call restaurant owners in Dubai to sell POS software at $99/mo' or 'Follow up with leads who downloaded our whitepaper about inventory management.'"
        ),
      workflow: z
        .enum(["cold_call", "appointment_set", "follow_up", "callback", "custom"])
        .optional()
        .describe(
          "Conversation workflow template. Auto-detected from objective if omitted."
        ),
      language: z
        .string()
        .optional()
        .describe(
          "Primary language (ISO 639-1). Auto-detected from target market if omitted. E.g., 'ar' for Arabic, 'hi' for Hindi."
        ),
      additional_context: z
        .string()
        .optional()
        .describe(
          "Extra context beyond registration. Product updates, specific campaign details, competitor info, pricing changes."
        ),
    },
    async (params) => {
      const client = getApiClient();

      try {
        const response = await client.post<CreateAgentResponse>(
          "/v1/agent-api/agents",
          {
            account_id: params.account_id,
            objective: params.objective,
            workflow: params.workflow,
            language: params.language,
            additional_context: params.additional_context,
          }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `Voice agent created!\n\nAgent ID: ${response.agent_id}\nName: ${response.name}\nObjective: ${response.objective}\nWorkflow: ${response.workflow}\nLanguage: ${response.language}\nEst. cost per call: ${response.estimated_cost_per_call}\nVoice preview: ${response.voice_preview_url}\nContext sources: ${response.context_sources.join(", ")}\n\nReady to make calls. Use vora_call with this agent_id.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Agent creation error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
