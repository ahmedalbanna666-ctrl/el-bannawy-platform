import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const APP_START_TIME = Date.now();

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  database: string;
  memory: {
    used: string;
    total: string;
    percent: number;
  };
  responseTime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  static getUptime(): number {
    return Math.round((Date.now() - APP_START_TIME) / 1000);
  }

  async check(): Promise<HealthStatus> {
    const start = Date.now();

    let database = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = "error";
      this.logger.error(`Database health check failed: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    const mem = process.memoryUsage();
    const usedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMb = Math.round(mem.heapTotal / 1024 / 1024);

    return {
      status: database === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: HealthService.getUptime(),
      database,
      memory: {
        used: `${usedMb}MB`,
        total: `${totalMb}MB`,
        percent: totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0,
      },
      responseTime: Date.now() - start,
    };
  }
}
