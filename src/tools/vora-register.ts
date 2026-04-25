import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getApiClient } from "../api-client.js";

interface RegisterResponse {
  status: "onboarding" | "complete";
  session_id?: string;
  questions?: Array<{
    id: string;
    question: string;
    type: "text" | "select" | "multi_select";
    options?: string[];
    required: boolean;
  }>;
  account_id?: string;
  context_score?: number;
  api_key?: string;
}

export function registerVoraRegister(server: McpServer): void {
  server.tool(
    "vora_register",
    `Create your Vora account through conversational onboarding. Vora asks you questions about your business, products, target customers, and objectives to build a rich profile. This produces dramatically better voice agents than one-shot configuration.

Multi-turn: call this tool, answer the returned questions, call again with your answers. Repeat until status is "complete" (typically 3-5 turns).

On completion you receive an account_id and API key to use with all other Vora tools.`,
    {
      session_id: z
        .string()
        .optional()
        .describe("Session ID from previous turn. Omit on first call."),
      name: z
        .string()
        .optional()
        .describe("Your agent or business name. Required on first call."),
      url: z
        .string()
        .optional()
        .describe(
          "Your website URL. Vora will crawl it to understand your business. Highly recommended."
        ),
      description: z
        .string()
        .optional()
        .describe(
          "What you do, what you sell, who your customers are. One paragraph."
        ),
      answers: z
        .record(z.string())
        .optional()
        .describe(
          "Answers to questions from the previous turn. Keys are question IDs, values are your answers."
        ),
    },
    async (params) => {
      const client = getApiClient();

      try {
        const response = await client.post<RegisterResponse>(
          "/v1/agent-api/register",
          {
            session_id: params.session_id,
            name: params.name,
            url: params.url,
            description: params.description,
            answers: params.answers,
          }
        );

        if (response.status === "onboarding") {
          const questionList = response.questions
            ?.map((q, i) => {
              let line = `${i + 1}. [${q.id}] ${q.question}`;
              if (q.options) {
                line += ` (options: ${q.options.join(", ")})`;
              }
              if (q.required) {
                line += " *required*";
              }
              return line;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text" as const,
                text: `Onboarding in progress. Please answer these questions and call vora_register again with your answers.\n\nSession ID: ${response.session_id}\n\nQuestions:\n${questionList}`,
              },
            ],
          };
        }

        // Complete
        return {
          content: [
            {
              type: "text" as const,
              text: `Account created successfully!\n\nAccount ID: ${response.account_id}\nAPI Key: ${response.api_key}\nContext Score: ${response.context_score}/100\n\nNext step: Call vora_create_agent to build your voice agent.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Registration error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
