import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getApiClient } from "../api-client.js";

interface CallResponse {
  call_id: string;
  status: "dialing" | "ringing" | "in_progress" | "completed" | "failed" | "no_answer" | "voicemail";
  duration_seconds?: number;
  outcome?: string;
  outcome_details?: {
    interested: boolean;
    budget_confirmed?: boolean;
    decision_maker?: boolean;
    next_step: string;
    meeting_time?: string;
    objections_raised: string[];
    sentiment: string;
    lead_score: number;
  };
  transcript_url?: string;
  recording_url?: string;
  cost_usdc?: string;
  learnings?: string[];
  estimated_duration?: string;
}

export function registerVoraCall(server: McpServer): void {
  server.tool(
    "vora_call",
    `Make an outbound phone call using your voice agent. Your agent handles the entire conversation autonomously — greeting, pitch, objection handling, qualification, closing — and returns a structured outcome.

Calls typically take 1-5 minutes. You can poll vora_calls for the result or provide a callback_url for async delivery.

The more lead_context you provide, the better the conversation. Tell Vora everything you know about who it's calling.`,
    {
      agent_id: z
        .string()
        .describe("Your voice agent ID from vora_create_agent."),
      phone: z
        .string()
        .describe(
          "Phone number in E.164 format. E.g., +15551234567, +971501234567, +919876543210."
        ),
      lead_context: z
        .string()
        .optional()
        .describe(
          "Everything you know about this lead. Name, title, company, size, how you found them, previous interactions, interests. Free-form text — the more the better."
        ),
      specific_objective: z
        .string()
        .optional()
        .describe(
          "Override or refine the agent's default objective for this call. E.g., 'They downloaded our pricing PDF yesterday — focus on closing, not educating.'"
        ),
      callback_url: z
        .string()
        .optional()
        .describe(
          "Webhook URL for async result delivery. Vora POSTs the full call result when complete. If omitted, poll vora_calls with the call_id."
        ),
    },
    async (params) => {
      const client = getApiClient();

      try {
        const response = await client.post<CallResponse>(
          "/v1/agent-api/calls",
          {
            agent_id: params.agent_id,
            phone: params.phone,
            lead_context: params.lead_context,
            specific_objective: params.specific_objective,
            callback_url: params.callback_url,
          }
        );

        // Call is still in progress (async)
        if (
          response.status === "dialing" ||
          response.status === "ringing" ||
          response.status === "in_progress"
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Call initiated!\n\nCall ID: ${response.call_id}\nStatus: ${response.status}\nEstimated duration: ${response.estimated_duration || "2-4 minutes"}\n\nPoll vora_calls({ call_id: "${response.call_id}" }) for the result.${params.callback_url ? `\nResult will also be sent to: ${params.callback_url}` : ""}`,
              },
            ],
          };
        }

        // Call completed synchronously (short call or error)
        return formatCallResult(response);
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Call error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function formatCallResult(response: CallResponse) {
  const lines: string[] = [
    `Call ${response.call_id} — ${response.status}`,
    `Duration: ${response.duration_seconds}s`,
    `Outcome: ${response.outcome}`,
  ];

  if (response.outcome_details) {
    const d = response.outcome_details;
    lines.push(`Lead Score: ${d.lead_score}/100`);
    lines.push(`Interested: ${d.interested}`);
    lines.push(`Sentiment: ${d.sentiment}`);
    lines.push(`Next Step: ${d.next_step}`);
    if (d.meeting_time) lines.push(`Meeting Booked: ${d.meeting_time}`);
    if (d.objections_raised.length > 0)
      lines.push(`Objections: ${d.objections_raised.join(", ")}`);
  }

  if (response.cost_usdc) lines.push(`Cost: ${response.cost_usdc} USDC`);
  if (response.transcript_url)
    lines.push(`Transcript: ${response.transcript_url}`);
  if (response.recording_url)
    lines.push(`Recording: ${response.recording_url}`);

  if (response.learnings && response.learnings.length > 0) {
    lines.push(`\nLearnings:`);
    response.learnings.forEach((l) => lines.push(`  - ${l}`));
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
