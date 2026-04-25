# @vora/voice — Voice for Autonomous AI Agents

Make phone calls, close deals, book meetings. Full-stack voice AI: brain + voice + ears.

## Install

```bash
npx @vora/voice
```

Or add to your MCP config:

```json
{
  "mcpServers": {
    "vora-voice": {
      "command": "npx",
      "args": ["@vora/voice"]
    }
  }
}
```

## Tools

| Tool                | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `vora_register`     | Create account. Vora interviews you about your business (3-5 turns). |
| `vora_create_agent` | Build a persistent voice agent for a specific use case.              |
| `vora_call`         | Make an outbound phone call. Returns structured outcome.             |
| `vora_calls`        | Check results, history, analytics, AI recommendations.               |
| `vora_update_agent` | Improve your agent based on call learnings.                          |

## Quick Start

```
1. vora_register → answer questions → get account_id
2. vora_create_agent → get agent_id
3. vora_call → make calls → get outcomes
4. vora_calls → check analytics
5. vora_update_agent → auto-improve
```

## Payment

- **x402 (USDC on Base)**: Zero-friction. Set `VORA_X402_ENABLED=true`.
- **API Key**: Set `VORA_API_KEY=your_key`. Get key from vora_register.

## Pricing

| What           | Cost           |
| -------------- | -------------- |
| Onboarding     | Free           |
| Agent creation | Free           |
| Outbound calls | $0.06-0.08/min |
| Phone numbers  | $2/mo          |

## Environment Variables

```
VORA_API_URL=https://agent.voicevora.com    # API endpoint (default)
VORA_API_KEY=vora_ak_...            # API key auth
VORA_X402_ENABLED=true              # Enable x402 USDC payments
```

## Languages

English, Arabic (all dialects), Hindi, Bengali, Tamil, Telugu, Vietnamese, Turkish, Russian, Serbian, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, and 15+ more.

## License

MIT
