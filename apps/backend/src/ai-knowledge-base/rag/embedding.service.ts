import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface EmbeddingConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

@Injectable()
export class EmbeddingService {
  private readonly config: EmbeddingConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      apiKey: this.configService.get<string>("AI_API_KEY") ?? "",
      endpoint: this.configService.get<string>("AI_EMBEDDING_ENDPOINT") ?? "https://api.openai.com/v1/embeddings",
      model: this.configService.get<string>("AI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      return this.fallbackEmbedding(text);
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.config.model,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${String(response.status)}`);
      }

      const data = (await response.json()) as { data: { embedding: number[] }[] };
      return data.data[0].embedding;
    } catch {
      return this.fallbackEmbedding(text);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  private fallbackEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const hash: Record<string, number> = {};
    for (const word of words) {
      hash[word] = (hash[word] ?? 0) + 1;
    }
    const keys = Object.keys(hash).sort();
    const embedding = new Array<number>(1536).fill(0);
    for (let i = 0; i < keys.length && i < 1536; i++) {
      embedding[i] = hash[keys[i]] / words.length;
    }
    return embedding;
  }
}
