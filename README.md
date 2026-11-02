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

- **x402 (USDC on Base)**: When the API responds with HTTP 402, this client can sign a USDC payment authorization and retry **only if `VORA_WALLET_PRIVATE_KEY` is set**. The client does **not** read `VORA_X402_ENABLED`; setting that flag neither enables nor disables paid retries. A configured private key may authorize a payment automatically on a 402 response. Review the payment terms and protect your signing key before using this path.
- **Free-trial wallet hint**: Setting `VORA_WALLET_ADDRESS` without a private key sends an `X-WALLET` header. It does not sign or retry paid requests.
- **API key**: `VORA_API_KEY` sends the legacy `X-Agent-Api-Key` header; the client documents this as an internal/admin path, not a replacement for wallet-based payment.

## Pricing

| What           | Cost           |
| -------------- | -------------- |
| Onboarding     | Free           |
| Agent creation | Free           |
| Outbound calls | $0.06-0.08/min |
| Phone numbers  | $2/mo          |

## Environment Variables

```
VORA_API_URL=https://agent.voicevora.com  # API endpoint (default)
VORA_API_KEY=vora_ak_...                  # Optional legacy/internal API key
VORA_WALLET_ADDRESS=0x...                 # Optional free-trial wallet hint (without a signing key)
VORA_X402_NETWORK=base                   # Optional: base (default) or base-sepolia

# Optional paid x402 retries: provide VORA_WALLET_PRIVATE_KEY securely at runtime.
# Treat the private key as a secret. Never commit it or put it in public MCP config.
```

## Languages

English, Arabic (all dialects), Hindi, Bengali, Tamil, Telugu, Vietnamese, Turkish, Russian, Serbian, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, and 15+ more.

## License

MIT
