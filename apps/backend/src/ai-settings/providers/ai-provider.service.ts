import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/services/encryption.service";
import { AiCostService, type AiCostBreakdown } from "./ai-cost.service";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  id: string;
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string | null;
  apiType?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  supportsStreaming: boolean;
}

/**
 * OpenAI API contract types.
 * - OPENAI_COMPATIBLE_CHAT: OpenAI Chat Completions (`POST {base}/chat/completions`), used by OpenAI, OpenCode Zen, and compatible gateways.
 * - OPENAI_RESPONSES: OpenAI Responses API (`POST {base}/responses`).
 */
export const API_TYPE = {
  OPENAI_RESPONSES: "OPENAI_RESPONSES",
  OPENAI_COMPATIBLE_CHAT: "OPENAI_COMPATIBLE_CHAT",
} as const;

export interface ChatCompletionResult {
  content: string;
  modelUsed: string;
  provider: string;
  tokensIn?: number;
  tokensOut?: number;
  cachedReadTokens?: number;
  cachedWriteTokens?: number;
  tokensTotal?: number;
  cost?: Pick<AiCostBreakdown, "requestCost" | "responseCost" | "cacheCost" | "totalCost">;
  currency?: string;
  streamed: boolean;
}

/**
 * ai-provider.service — abstraction layer over configurable LLM providers.
 *
 * Supports OpenAI, Gemini, and Claude chat-completions formats with:
 * - provider failover ordered by priority (isEnabled + isActive only)
 * - streaming via SSE (OpenAI-style chunks and Gemini native chunks)
 * - per-provider health checks used by the admin providers dashboard
 *
 * No secrets are exposed to the client: apiKey is decrypted in-memory only.
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly cost: AiCostService,
  ) {}

  async getEnabledConfigs(): Promise<ProviderConfig[]> {
    const configs = await this.prisma.aiModelConfig.findMany({
      where: { isActive: true, isEnabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    const result: ProviderConfig[] = [];
    for (const c of configs) {
      try {
        result.push({ ...c, apiKey: this.encryption.decrypt(c.apiKey) });
      } catch (err) {
        this.logger.warn(`Skipping provider config ${c.provider}/${c.modelName}: cannot decrypt apiKey (${err instanceof Error ? err.message : "unknown error"})`);
      }
    }
    return result;
  }

  async getProviderConfig(id: string): Promise<ProviderConfig | null> {
    const config = await this.prisma.aiModelConfig.findFirst({ where: { id } });
    if (!config) return null;
    try {
      return { ...config, apiKey: this.encryption.decrypt(config.apiKey) };
    } catch (err) {
      this.logger.warn(`Provider config ${config.provider}/${config.modelName} apiKey cannot be decrypted (${err instanceof Error ? err.message : "unknown error"})`);
      return null;
    }
  }

  /**
   * Best-effort provider selection with automatic failover.
   * Returns { content, provider } or null if every configured provider fails.
   */
  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; stream?: boolean; signal?: AbortSignal },
  ): Promise<ChatCompletionResult | null> {
    const configs = await this.getEnabledConfigs();
    if (configs.length === 0) {
      this.logger.warn("No enabled AI provider configured");
      return null;
    }

    let lastError: unknown = null;
    for (const config of configs) {
      try {
        const result = await this.callProvider(config, messages, options);
        await this.markHealth(config.id, true);
        const cost = this.cost.computeChatCost(config.modelName, {
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          cachedReadTokens: result.cachedReadTokens,
          cachedWriteTokens: result.cachedWriteTokens,
        });
        return {
          ...result,
          provider: config.provider,
          modelUsed: config.modelName,
          tokensTotal: (result.tokensIn ?? 0) + (result.tokensOut ?? 0),
          cost,
          currency: this.cost.currency,
        };
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Provider ${config.provider}/${config.modelName} failed: ${message}`);
        await this.markHealth(config.id, false, message);
      }
    }

    this.logger.error(`All AI providers failed. Last error: ${String(lastError)}`);
    return null;
  }

  private async callProvider(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<{ content: string; tokensIn?: number; tokensOut?: number; cachedReadTokens?: number; cachedWriteTokens?: number; streamed: boolean }> {
    switch (config.provider.toUpperCase()) {
      case "GEMINI":
        return this.callGemini(config, messages, options);
      case "CLAUDE":
        return this.callClaude(config, messages, options);
      case "OPENCODE":
      case "OPENAI":
      default:
        return this.callOpenAi(config, messages, options);
    }
  }

  private async callOpenAi(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<{ content: string; tokensIn?: number; tokensOut?: number; cachedReadTokens?: number; cachedWriteTokens?: number; streamed: boolean }> {
    const endpoint = this.buildOpenAiEndpoint(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    try {
      const response = await fetch(endpoint, {
        signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(this.buildOpenAiRequestBody(config, messages, options, false)),
      });

      this.logDevCall(config, endpoint, response, "POST");

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${String(response.status)}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_tokens_details?: { cached_tokens?: number };
        };
      };
      const content = data.choices[0]?.message.content;
      if (!content) throw new Error("Empty completion from provider");
      return {
        content,
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens,
        cachedReadTokens: data.usage?.prompt_tokens_details?.cached_tokens,
        streamed: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Builds the final HTTP endpoint for an OpenAI-family provider.
   *
   * - OPENAI_COMPATIBLE_CHAT: the base URL is the API root, and the endpoint is `${base}/chat/completions`.
   *   This covers OpenCode Zen (`https://opencode.ai/zen/v1` -> `https://opencode.ai/zen/v1/chat/completions`).
   *   If the stored baseUrl already ends with `/chat/completions`, it is used as-is (backward compatible).
   * - OPENAI_RESPONSES: endpoint is `${base}/responses`.
   * - No baseUrl: falls back to the native OpenAI defaults.
   */
  private buildOpenAiEndpoint(config: ProviderConfig): string {
    const apiType = config.apiType ?? API_TYPE.OPENAI_COMPATIBLE_CHAT;

    if (apiType === API_TYPE.OPENAI_RESPONSES) {
      const base = config.baseUrl ?? "https://api.openai.com/v1";
      return this.joinUrl(base, "responses");
    }

    const base = config.baseUrl ?? "https://api.openai.com/v1";
    if (base.endsWith("/chat/completions")) return base;
    return this.joinUrl(base, "chat/completions");
  }

  private joinUrl(base: string, path: string): string {
    const trimmedBase = base.replace(/\/+$/, "");
    return `${trimmedBase}/${path}`;
  }

  private buildOpenAiRequestBody(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
    stream = false,
  ): Record<string, unknown> {
    const apiType = config.apiType ?? API_TYPE.OPENAI_COMPATIBLE_CHAT;
    if (apiType === API_TYPE.OPENAI_RESPONSES) {
      return {
        model: config.modelName,
        input: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? config.temperature,
        max_output_tokens: options?.maxTokens ?? config.maxTokens,
        stream,
      };
    }
    return {
      model: config.modelName,
      messages,
      temperature: options?.temperature ?? config.temperature,
      max_tokens: options?.maxTokens ?? config.maxTokens,
      stream,
    };
  }

  private logDevCall(
    config: ProviderConfig,
    endpoint: string,
    response: { status: number; headers?: Headers },
    method = "POST",
  ): void {
    if ((process.env.NODE_ENV ?? "development") !== "production") {
      const contentType = response.headers?.get("content-type") ?? "";
      this.logger.log(
        `[AI Call] provider=${config.provider} baseUrl=${config.baseUrl ?? "(default)"} apiType=${config.apiType ?? "OPENAI_COMPATIBLE_CHAT"} model=${config.modelName} url=${endpoint} method=${method} http=${String(response.status)} contentType=${contentType}`,
      );
    }
  }

  private async callGemini(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<{ content: string; tokensIn?: number; tokensOut?: number; cachedReadTokens?: number; cachedWriteTokens?: number; streamed: boolean }> {
    const endpoint = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta/models";
    const url = `${endpoint}/${config.modelName}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const response = await fetch(url, {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          generationConfig: {
            temperature: options?.temperature ?? config.temperature,
            maxOutputTokens: options?.maxTokens ?? config.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${String(response.status)}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        candidates?: { content: { parts: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!content) throw new Error("Empty completion from provider");
      return {
        content,
        tokensIn: data.usageMetadata?.promptTokenCount,
        tokensOut: data.usageMetadata?.candidatesTokenCount,
        streamed: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callClaude(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<{ content: string; tokensIn?: number; tokensOut?: number; cachedReadTokens?: number; cachedWriteTokens?: number; streamed: boolean }> {
    const endpoint = config.baseUrl ?? "https://api.anthropic.com/v1/messages";
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(endpoint, {
        signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.modelName,
          system: system || undefined,
          messages: conversation,
          temperature: options?.temperature ?? config.temperature,
          max_tokens: options?.maxTokens ?? config.maxTokens,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${String(response.status)}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        content?: { text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const content = data.content?.map((c) => c.text ?? "").join("") ?? "";
      if (!content) throw new Error("Empty completion from provider");
      return {
        content,
        tokensIn: data.usage?.input_tokens,
        tokensOut: data.usage?.output_tokens,
        streamed: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Streams tokens through an AsyncGenerator so controllers can emit SSE.
   * Falls back to the non-streaming chat() when streaming is unavailable.
   */
  async *streamChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const configs = await this.getEnabledConfigs();
    if (configs.length === 0) return;

    for (const config of configs) {
      if (!config.supportsStreaming) {
        const fallback = await this.callProvider(config, messages, options);
        yield fallback.content;
        return;
      }

      try {
        const stream = this.openStream(config, messages, options);
        yield* stream;
        await this.markHealth(config.id, true);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Stream provider ${config.provider}/${config.modelName} failed: ${message}`);
        await this.markHealth(config.id, false, message);
      }
    }
  }

  private async *openStream(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): AsyncGenerator<string> {
    switch (config.provider.toUpperCase()) {
      case "GEMINI":
        yield* this.streamGemini(config, messages, options);
        return;
      case "CLAUDE":
        yield* this.streamClaude(config, messages, options);
        return;
      case "OPENCODE":
      case "OPENAI":
      default:
        yield* this.streamOpenAi(config, messages, options);
    }
  }

  private async *streamOpenAi(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const endpoint = this.buildOpenAiEndpoint(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    try {
      const response = await fetch(endpoint, {
        signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(this.buildOpenAiRequestBody(config, messages, options, true)),
      });

      this.logDevCall(config, endpoint, response, "POST");

      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") return;
            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *streamGemini(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const endpoint = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta/models";
    const url = `${endpoint}/${config.modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const response = await fetch(url, {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          generationConfig: {
            temperature: options?.temperature ?? config.temperature,
            maxOutputTokens: options?.maxTokens ?? config.maxTokens,
          },
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            try {
              const json = JSON.parse(payload) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
              const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
              if (text) yield text;
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *streamClaude(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): AsyncGenerator<string> {
    const endpoint = config.baseUrl ?? "https://api.anthropic.com/v1/messages";
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, config.timeout * 1000);
    const signal = this.combineSignals(controller.signal, options?.signal);

    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(endpoint, {
        signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.modelName,
          system: system || undefined,
          messages: conversation,
          temperature: options?.temperature ?? config.temperature,
          max_tokens: options?.maxTokens ?? config.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      if (!response.body) throw new Error("No response body for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            try {
              const json = JSON.parse(payload) as { type?: string; delta?: { text?: string } };
              if (json.type === "content_block_delta" && json.delta?.text) {
                yield json.delta.text;
              }
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Health probe: issues a minimal completion against the provider.
   * Used by the admin health dashboard and failover bookkeeping.
   */
  async probeHealth(configId: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const config = await this.getProviderConfig(configId);
    if (!config) return { ok: false, message: "Config not found", latencyMs: 0 };

    const started = Date.now();
    try {
      await this.callProvider(config, [{ role: "user", content: "ping" }], { maxTokens: 8 });
      const latencyMs = Date.now() - started;
      await this.markHealth(configId, true);
      return { ok: true, message: "OK", latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      await this.markHealth(configId, false, message);
      return { ok: false, message, latencyMs };
    }
  }

  private async markHealth(configId: string, ok: boolean, error?: string): Promise<void> {
    await this.prisma.aiModelConfig.update({
      where: { id: configId },
      data: {
        healthStatus: ok ? "HEALTHY" : "UNHEALTHY",
        lastHealthCheckAt: new Date(),
        lastError: ok ? null : (error ?? "Unknown error"),
      },
    }).catch(() => undefined);
  }

  private combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const present = signals.filter((s): s is AbortSignal => Boolean(s));
    if (present.length <= 1) return present[0] ?? new AbortController().signal;
    const controller = new AbortController();
    for (const signal of present) {
      if (signal.aborted) {
        controller.abort();
        return controller.signal;
      }
      signal.addEventListener("abort", () => { controller.abort(); }, { once: true });
    }
    return controller.signal;
  }
}
