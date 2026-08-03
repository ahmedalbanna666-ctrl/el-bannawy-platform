import { Controller, Get, UseGuards } from "@nestjs/common";
import { MetricsService } from "../common/services/metrics.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("metrics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMINISTRATOR")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
