import { Injectable, Logger } from "@nestjs/common";
import type { VideoProviderStrategy, VideoProviderResult } from "./video-provider.interface";

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<string, VideoProviderStrategy>();

  register(provider: VideoProviderStrategy): void {
    const name = provider.providerName;
    if (this.providers.has(name)) {
      this.logger.warn(`Provider "${name}" is already registered. Skipping duplicate.`);
      return;
    }
    this.providers.set(name, provider);
    this.logger.log(`Provider "${name}" registered successfully`);
  }

  getProvider(providerName: string): VideoProviderStrategy {
    const provider = this.providers.get(providerName.toUpperCase());
    if (!provider) {
      throw new Error(`Video provider "${providerName}" is not registered`);
    }
    return provider;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  resolveProvider(url: string): VideoProviderStrategy {
    for (const provider of this.providers.values()) {
      if (provider.canHandle(url)) {
        return provider;
      }
    }
    throw new Error(`No video provider found that can handle URL: ${url}`);
  }

  resolve(url: string): VideoProviderResult {
    const provider = this.resolveProvider(url);
    return provider.resolve(url);
  }

  isUrlSupported(url: string): boolean {
    try {
      this.resolveProvider(url);
      return true;
    } catch {
      return false;
    }
  }
}
