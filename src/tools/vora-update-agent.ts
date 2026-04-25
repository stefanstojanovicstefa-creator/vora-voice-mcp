import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getApiClient } from "../api-client.js";

interface UpdateAgentResponse {
  agent_id: string;
  updated_fields: string[];
  context_score: number;
  applied_learnings?: string[];
  recompiled?: boolean;
  message: string;
}

export function registerVoraUpdateAgent(server: McpServer): void {
  server.tool(
    "vora_update_agent",
    `Incrementally improve your voice agent without full recompilation. Use this to:

- Add new objection responses based on what you're hearing in calls
- Update pricing or product information
- Apply AI-recommended improvements from call analytics (apply_learnings)
- Refine your objective based on what's working
- Force a full recompile when your website has significantly changed

Changes take effect on the very next call. The apply_learnings option is powerful — Vora analyzes all your past calls and automatically updates objection handling, greetings, and qualification criteria based on what's actually converting.`,
    {
      agent_id: z
        .string()
        .describe("The voice agent to update."),
      add_objection_response: z
        .object({
          objection: z
            .string()
            .describe(
              "The objection to handle. E.g., 'We already use Toast' or 'Too expensive'"
            ),
          response: z
            .string()
            .describe(
              "How to respond. E.g., 'Many of our best customers switched from Toast because of our Arabic language support...'"
            ),
        })
        .optional()
        .describe("Add a specific objection-response pair."),
      update_pricing: z
        .string()
        .optional()
        .describe(
          "New pricing information. Replaces the current pricing in the pitch."
        ),
      update_context: z
        .string()
        .optional()
        .describe(
          "Additional business context. New product features, changed messaging, new competitors, etc."
        ),
      update_objective: z
        .string()
        .optional()
        .describe(
          "Refined calling objective based on what's working. E.g., switch from 'qualify for enterprise' to 'book demo for SMBs'."
        ),
      apply_learnings: z
        .boolean()
        .optional()
        .describe(
          "Auto-apply Vora's recommended improvements from call analytics. Analyzes all past calls and updates objection handling, greetings, and qualification criteria. Powerful after 10+ calls."
        ),
      recompile: z
        .boolean()
        .optional()
        .describe(
          "Full recompilation from your website URL + all accumulated context. Use when your website has significantly changed. Preserves all call learnings."
        ),
    },
    async (params) => {
      const client = getApiClient();

      try {
        const response = await client.patch<UpdateAgentResponse>(
          `/v1/agent-api/agents/${params.agent_id}`,
          {
            add_objection_response: params.add_objection_response,
            update_pricing: params.update_pricing,
            update_context: params.update_context,
            update_objective: params.update_objective,
            apply_learnings: params.apply_learnings,
            recompile: params.recompile,
          }
        );

        const lines: string[] = [
          `Agent ${response.agent_id} updated!`,
          `Context Score: ${response.context_score}/100`,
          `Updated: ${response.updated_fields.join(", ")}`,
        ];

        if (response.applied_learnings && response.applied_learnings.length > 0) {
          lines.push(`\nApplied Learnings:`);
          response.applied_learnings.forEach((l) => lines.push(`  - ${l}`));
        }

        if (response.recompiled) {
          lines.push(`\nFull recompile completed. Website re-crawled and agent rebuilt with all accumulated learnings preserved.`);
        }

        lines.push(`\n${response.message}`);

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Update error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
