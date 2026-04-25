/**
 * Vora API Client — communication with the Vora backend.
 *
 * Auth paths (in priority order):
 *   1. x402 wallet (VORA_WALLET_PRIVATE_KEY set) — signs EIP-3009 USDC auth on 402
 *   2. Free-trial wallet (VORA_WALLET_ADDRESS set, no priv key) — sends X-WALLET header
 *   3. Legacy API key (VORA_API_KEY set) — sends X-Agent-Api-Key (internal/admin only)
 */

import { createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

export interface VoraApiConfig {
  baseUrl: string;
  apiKey?: string;
  walletPrivateKey?: string; // 0x-prefixed
  walletAddress?: string;    // free-trial path when priv key absent
  network?: "base" | "base-sepolia";
}

const DEFAULT_BASE_URL = "https://agent.voicevora.com";

type PaymentRequirement = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: Address;
  maxTimeoutSeconds: number;
  asset: Address;
  extra: { name: string; version: string };
};

type ChallengeBody = {
  x402Version: 1;
  accepts: PaymentRequirement[];
  error: string | null;
  _hint?: Record<string, unknown>;
};

export class VoraApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private walletPrivateKey?: Hex;
  private walletAddress?: string;
  private network: "base" | "base-sepolia";

  constructor(config?: Partial<VoraApiConfig>) {
    this.baseUrl = config?.baseUrl || process.env.VORA_API_URL || DEFAULT_BASE_URL;
    this.apiKey = config?.apiKey || process.env.VORA_API_KEY;
    const pk = config?.walletPrivateKey || process.env.VORA_WALLET_PRIVATE_KEY;
    if (pk) this.walletPrivateKey = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
    this.walletAddress = (config?.walletAddress || process.env.VORA_WALLET_ADDRESS || "").toLowerCase() || undefined;
    this.network = (config?.network || process.env.VORA_X402_NETWORK || "base") as "base" | "base-sepolia";
  }

  async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "vora-voice-mcp/0.1.0",
    };

    // Legacy API-key path
    if (this.apiKey) headers["X-Agent-Api-Key"] = this.apiKey;

    // Free-trial hint — if we have a wallet address but no priv key, send X-WALLET
    if (!this.walletPrivateKey && this.walletAddress) {
      headers["X-WALLET"] = this.walletAddress;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 402) {
      // Only wallet+priv-key can pay; free-trial hit the wall
      if (!this.walletPrivateKey) {
        const challenge = (await response.json().catch(() => ({}))) as Partial<ChallengeBody>;
        throw new Error(
          `Payment required (402). Set VORA_WALLET_PRIVATE_KEY to pay via x402, or exhausted free trial. ` +
            `Details: ${JSON.stringify(challenge?._hint ?? challenge?.accepts?.[0] ?? {})}`
        );
      }
      return this.handleX402Payment<T>(response, method, url, headers, body);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vora API error (${response.status}): ${error}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * x402 paid retry. Signs EIP-3009 TransferWithAuthorization, re-requests with X-PAYMENT header.
   */
  private async handleX402Payment<T>(
    response: Response,
    method: string,
    url: string,
    baseHeaders: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<T> {
    const challenge = (await response.json()) as ChallengeBody;
    const req = challenge.accepts?.[0];
    if (!req) throw new Error("x402 challenge missing `accepts` entry");

    if (!this.walletPrivateKey) {
      throw new Error("VORA_WALLET_PRIVATE_KEY not set — cannot sign x402 payment");
    }

    const account = privateKeyToAccount(this.walletPrivateKey);
    const chain = this.network === "base" ? base : baseSepolia;

    // EIP-3009 TransferWithAuthorization typed data
    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 10);
    const validBefore = BigInt(now + Math.max(30, req.maxTimeoutSeconds - 5));
    const nonce = ("0x" +
      Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")) as Hex;

    const authorization = {
      from: account.address,
      to: req.payTo,
      value: BigInt(req.maxAmountRequired),
      validAfter,
      validBefore,
      nonce,
    } as const;

    const signature = await account.signTypedData({
      domain: {
        name: req.extra.name,
        version: req.extra.version,
        chainId: chain.id,
        verifyingContract: req.asset,
      },
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "TransferWithAuthorization",
      message: authorization,
    });

    const paymentPayload = {
      x402Version: 1,
      scheme: "exact" as const,
      network: req.network,
      payload: {
        signature,
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value.toString(),
          validAfter: authorization.validAfter.toString(),
          validBefore: authorization.validBefore.toString(),
          nonce,
        },
      },
    };

    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload), "utf-8").toString("base64");

    const retry = await fetch(url, {
      method,
      headers: { ...baseHeaders, "X-PAYMENT": paymentHeader },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (retry.status === 402) {
      const text = await retry.text().catch(() => "");
      throw new Error(`x402 retry still 402: ${text}`);
    }
    if (!retry.ok) {
      const text = await retry.text();
      throw new Error(`Vora API error after payment (${retry.status}): ${text}`);
    }
    return retry.json() as Promise<T>;
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, body);
  }
  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
}

let client: VoraApiClient | null = null;
export function getApiClient(): VoraApiClient {
  if (!client) client = new VoraApiClient();
  return client;
}
