import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getApiClient } from "../api-client.js";

interface CallSummary {
  call_id: string;
  phone: string;
  status: string;
  outcome: string;
  lead_score: number;
  duration_seconds: number;
  cost_usdc: string;
  created_at: string;
}

interface CallsResponse {
  calls: CallSummary[];
  analytics?: {
    total_calls: number;
    conversion_rate: number;
    avg_duration_seconds: number;
    avg_cost_per_call: string;
    top_objections: string[];
    best_time_to_call: string;
    recommendations: string[];
  };
}

interface CallDetailResponse {
  call_id: string;
  status: string;
  phone: string;
  duration_seconds: number;
  outcome: string;
  outcome_details: {
    interested: boolean;
    budget_confirmed?: boolean;
    decision_maker?: boolean;
    next_step: string;
    meeting_time?: string;
    objections_raised: string[];
    sentiment: string;
    lead_score: number;
  };
  transcript_url: string;
  recording_url: string;
  cost_usdc: string;
  learnings: string[];
  created_at: string;
}

export function registerVoraCalls(server: McpServer): void {
  server.tool(
    "vora_calls",
    `Query your call history, results, and analytics. Use to:
- Check the result of a specific call (by call_id)
- View recent call history for an agent
- Get aggregate analytics with conversion rates, top objections, and AI recommendations

The analytics include AI-generated recommendations for improving your calls.`,
    {
      call_id: z
        .string()
        .optional()
        .describe("Get full details for a specific call."),
      agent_id: z
        .string()
        .optional()
        .describe("Filter calls by voice agent."),
      status: z
        .enum([
          "dialing",
          "in_progress",
          "completed",
          "failed",
          "no_answer",
          "voicemail",
        ])
        .optional()
        .describe("Filter by call status."),
      last: z
        .number()
        .optional()
        .describe("Return last N calls. Default 10, max 100."),
      include_analytics: z
        .boolean()
        .optional()
        .describe(
          "Include aggregate metrics: conversion rate, avg duration, top objections, best call times, AI recommendations. Default false."
        ),
    },
    async (params) => {
      const client = getApiClient();

      try {
        // Single call detail
        if (params.call_id) {
          const call = await client.get<CallDetailResponse>(
            `/v1/agent-api/calls/${params.call_id}`
          );

          const lines: string[] = [
            `Call ${call.call_id} — ${call.status}`,
            `Phone: ${call.phone}`,
            `Duration: ${call.duration_seconds}s`,
            `Outcome: ${call.outcome}`,
            `Lead Score: ${call.outcome_details.lead_score}/100`,
            `Interested: ${call.outcome_details.interested}`,
            `Sentiment: ${call.outcome_details.sentiment}`,
            `Next Step: ${call.outcome_details.next_step}`,
          ];

          if (call.outcome_details.meeting_time)
            lines.push(`Meeting: ${call.outcome_details.meeting_time}`);
          if (call.outcome_details.objections_raised.length > 0)
            lines.push(
              `Objections: ${call.outcome_details.objections_raised.join(", ")}`
            );
          lines.push(`Cost: ${call.cost_usdc} USDC`);
          lines.push(`Transcript: ${call.transcript_url}`);
          lines.push(`Recording: ${call.recording_url}`);

          if (call.learnings.length > 0) {
            lines.push(`\nLearnings:`);
            call.learnings.forEach((l) => lines.push(`  - ${l}`));
          }

          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // Call list with optional analytics
        const queryParams = new URLSearchParams();
        if (params.agent_id) queryParams.set("agent_id", params.agent_id);
        if (params.status) queryParams.set("status", params.status);
        if (params.last) queryParams.set("last", String(params.last));
        if (params.include_analytics)
          queryParams.set("include_analytics", "true");

        const response = await client.get<CallsResponse>(
          `/v1/agent-api/calls?${queryParams.toString()}`
        );

        const lines: string[] = [`${response.calls.length} calls found:\n`];

        for (const call of response.calls) {
          lines.push(
            `  ${call.call_id} | ${call.phone} | ${call.status} | ${call.outcome} | Score: ${call.lead_score} | ${call.duration_seconds}s | ${call.cost_usdc} USDC | ${call.created_at}`
          );
        }

        if (response.analytics) {
          const a = response.analytics;
          lines.push(`\n--- Analytics ---`);
          lines.push(`Total Calls: ${a.total_calls}`);
          lines.push(
            `Conversion Rate: ${(a.conversion_rate * 100).toFixed(1)}%`
          );
          lines.push(`Avg Duration: ${a.avg_duration_seconds}s`);
          lines.push(`Avg Cost/Call: ${a.avg_cost_per_call}`);
          lines.push(`Top Objections: ${a.top_objections.join(", ")}`);
          lines.push(`Best Time to Call: ${a.best_time_to_call}`);
          lines.push(`\nRecommendations:`);
          a.recommendations.forEach((r) => lines.push(`  - ${r}`));
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Query error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
