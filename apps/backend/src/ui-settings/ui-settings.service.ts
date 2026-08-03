import { Injectable } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { PrismaService } from "src/prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import type { UpdateUiSettingsDto } from "./dto/update-ui-settings.dto";

const UI_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "ui");

const DEFAULT_CONFIG = {
  fonts: {
    arabic: "Cairo, Noto Sans Arabic, sans-serif",
    english: "Inter, system-ui, Arial, sans-serif",
  },
  colors: {
    primary: "#06b6d4",
    cardBg: "#ffffff",
    cardBgDark: "rgba(16,25,45,0.92)",
  },
  backgrounds: {
    light: "#f8fafc",
    dark: "#0a0e1a",
    image: "",
  },
  sidebar: {
    backgroundImage: "",
  },
  splashScreen: {
    enabled: true,
    backgroundColor: "#0a0e1a",
    logoUrl: "",
  },
  cardBorder: {
    enabled: true,
    color: "rgba(34,211,238,0.25)",
    colorDark: "rgba(34,211,238,0.35)",
    width: 4,
    side: "left",
    groups: {
      staff: {
        enabled: false,
        color: "rgba(34,211,238,0.25)",
        colorDark: "rgba(34,211,238,0.35)",
        width: 4,
        side: "left",
        pages: ["dashboard", "units", "lessons", "lesson-detail", "quiz", "homework", "reports", "live", "ai", "competitions", "mistakes", "students", "teachers", "teacher", "notifications", "support", "profile", "admin"],
      },
      student: {
        enabled: true,
        color: "rgba(34,211,238,0.25)",
        colorDark: "rgba(34,211,238,0.35)",
        width: 4,
        side: "left",
        pages: ["dashboard", "lessons", "lesson-detail", "quiz"],
      },
      auth: {
        enabled: true,
        color: "rgba(34,211,238,0.25)",
        colorDark: "rgba(34,211,238,0.35)",
        width: 4,
        side: "left",
        pages: ["login", "register"],
      },
    },
  },
  sidebarBorder: {
    enabled: true,
    color: "rgba(255,255,255,0.1)",
    width: 1,
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable()
export class UiSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<Record<string, unknown>> {
    const record = await this.prisma.uiConfig.findFirst({ where: { key: "default" } });
    if (!record) {
      return DEFAULT_CONFIG;
    }
    const config = record.config as Record<string, unknown>;
    return deepMerge(DEFAULT_CONFIG, config);
  }

  async updateConfig(dto: UpdateUiSettingsDto): Promise<Record<string, unknown>> {
    const existing = await this.prisma.uiConfig.findFirst({ where: { key: "default" } });
    const currentConfig = existing
      ? (existing.config as Record<string, unknown>)
      : DEFAULT_CONFIG;

    const merged = deepMerge(currentConfig, dto as unknown as Record<string, unknown>);

    if (existing) {
      await this.prisma.uiConfig.update({ where: { id: existing.id }, data: { config: merged as Prisma.InputJsonValue } });
    } else {
      await this.prisma.uiConfig.create({ data: { config: merged as Prisma.InputJsonValue, key: "default", label: "UI Configuration" } });
    }

    return merged;
  }

  async resetConfig(): Promise<Record<string, unknown>> {
    const existing = await this.prisma.uiConfig.findFirst({ where: { key: "default" } });
    if (existing) {
      await this.prisma.uiConfig.update({ where: { id: existing.id }, data: { config: DEFAULT_CONFIG } });
    }
    return DEFAULT_CONFIG;
  }

  async saveImage(buffer: Buffer, originalName: string, kind: string): Promise<string> {
    await fs.mkdir(UI_UPLOAD_ROOT, { recursive: true });
    const safeKind = /^[a-zA-Z0-9-]+$/.test(kind) ? kind : "image";
    const ext = path.extname(originalName).toLowerCase().slice(0, 10) || ".png";
    const storedName = `${safeKind}-${String(Date.now())}${ext}`;
    await fs.writeFile(path.join(UI_UPLOAD_ROOT, storedName), buffer);
    return `/files/ui/${storedName}`;
  }
}
