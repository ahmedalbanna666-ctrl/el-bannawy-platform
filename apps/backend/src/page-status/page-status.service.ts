import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { PageStatusEntryDto } from "./dto/page-status-entry.dto";

export interface PageStatusEntry {
  disabled: boolean;
  title: string;
  message: string;
  whatsapp: string;
}

export interface PageStatusConfig {
  global: PageStatusEntry;
  pages: Record<string, PageStatusEntry>;
}

const SETTING_KEY = "page_statuses";

function defaultEntry(): PageStatusEntry {
  return { disabled: false, title: "", message: "", whatsapp: "" };
}

function defaultConfig(): PageStatusConfig {
  return { global: defaultEntry(), pages: {} };
}

function sanitizeEntry(raw: unknown): PageStatusEntry {
  const entry = defaultEntry();
  if (!raw || typeof raw !== "object") return entry;
  const obj = raw as Record<string, unknown>;
  entry.disabled = typeof obj.disabled === "boolean" ? obj.disabled : false;
  entry.title = typeof obj.title === "string" ? obj.title : "";
  entry.message = typeof obj.message === "string" ? obj.message : "";
  entry.whatsapp = typeof obj.whatsapp === "string" ? obj.whatsapp : "";
  return entry;
}

function sanitize(raw: unknown): PageStatusConfig {
  const config = defaultConfig();
  if (!raw || typeof raw !== "object") return config;
  const obj = raw as Record<string, unknown>;
  config.global = sanitizeEntry(obj.global);
  if (obj.pages && typeof obj.pages === "object") {
    for (const [key, value] of Object.entries(obj.pages as Record<string, unknown>)) {
      config.pages[key] = sanitizeEntry(value);
    }
  }
  return config;
}

function applyPartial(current: PageStatusEntry, dto: PageStatusEntryDto): PageStatusEntry {
  return {
    disabled: dto.disabled,
    title: dto.title ?? current.title,
    message: dto.message ?? current.message,
    whatsapp: dto.whatsapp ?? current.whatsapp,
  };
}

@Injectable()
export class PageStatusService {
  constructor(private readonly prisma: PrismaService) {}

  private async readConfig(): Promise<PageStatusConfig> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (!setting) return defaultConfig();
    try {
      return sanitize(JSON.parse(setting.value));
    } catch {
      return defaultConfig();
    }
  }

  private async writeConfig(config: PageStatusConfig): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    });
  }

  async getStatus(): Promise<PageStatusConfig> {
    return this.readConfig();
  }

  async updateGlobal(dto: PageStatusEntryDto): Promise<PageStatusConfig> {
    const config = await this.readConfig();
    config.global = applyPartial(config.global, dto);
    await this.writeConfig(config);
    return config;
  }

  async updatePage(pageKey: string, dto: PageStatusEntryDto): Promise<PageStatusConfig> {
    const config = await this.readConfig();
    const current = config.pages[pageKey] ?? defaultEntry();
    config.pages[pageKey] = applyPartial(current, dto);
    await this.writeConfig(config);
    return config;
  }
}
