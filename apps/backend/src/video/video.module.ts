import { Module, OnModuleInit } from "@nestjs/common";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { VideoRepository } from "./video.repository";
import { ProviderRegistryService } from "./providers/provider-registry.service";
import { YouTubeProvider } from "./providers/youtube/youtube.provider";

@Module({
  controllers: [VideoController],
  providers: [VideoService, VideoRepository, ProviderRegistryService, YouTubeProvider],
  exports: [VideoService, VideoRepository, ProviderRegistryService],
})
export class VideoModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly youtubeProvider: YouTubeProvider,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this.youtubeProvider);
  }
}
