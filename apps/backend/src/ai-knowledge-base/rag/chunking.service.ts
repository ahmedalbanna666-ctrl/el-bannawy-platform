import { Injectable } from "@nestjs/common";

export interface ChunkResult {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_OVERLAP = 200;

  chunkText(text: string, options?: { chunkSize?: number; overlap?: number }): ChunkResult[] {
    const chunkSize = options?.chunkSize ?? this.DEFAULT_CHUNK_SIZE;
    const overlap = options?.overlap ?? this.DEFAULT_OVERLAP;
    const chunks: ChunkResult[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = "";
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if ((currentChunk + "\n\n" + trimmed).length > chunkSize && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), index: chunkIndex++, metadata: {} });
        const words = currentChunk.split(/\s+/);
        const overlapText = words.slice(-Math.min(overlap, words.length)).join(" ");
        currentChunk = overlapText + "\n\n" + trimmed;
      } else {
        currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ content: currentChunk.trim(), index: chunkIndex, metadata: {} });
    }

    return chunks;
  }

  chunkBySentences(text: string, maxSentences = 10): ChunkResult[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    const chunks: ChunkResult[] = [];
    let current: string[] = [];
    let chunkIndex = 0;

    for (const sentence of sentences) {
      current.push(sentence.trim());
      if (current.length >= maxSentences) {
        chunks.push({ content: current.join(" "), index: chunkIndex++, metadata: {} });
        current = current.slice(-2);
      }
    }

    if (current.length > 0) {
      chunks.push({ content: current.join(" "), index: chunkIndex, metadata: {} });
    }

    return chunks;
  }
}
