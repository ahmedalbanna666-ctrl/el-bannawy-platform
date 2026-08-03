import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";
import { successResponse, type ISuccessResponse } from "../common/helpers/response.helper";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<ISuccessResponse<unknown>> {
    return successResponse(await this.healthService.check());
  }

  @Get("ready")
  async ready(): Promise<{ status: string }> {
    const result = await this.healthService.check();
    return { status: result.database === "ok" ? "ready" : "not ready" };
  }

  @Get("live")
  live(): { status: string; uptime: number } {
    return { status: "alive", uptime: HealthService.getUptime() };
  }
}
