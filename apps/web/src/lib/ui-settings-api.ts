import { api } from "@/lib/api-client";

export type CardBorderSide = "left" | "top" | "right" | "bottom";

export interface CardBorderGroupSettings {
  enabled: boolean;
  color: string;
  colorDark: string;
  width: number;
  side: CardBorderSide;
  pages: string[];
}

export interface CardBorderGroupsSettings {
  staff: CardBorderGroupSettings;
  student: CardBorderGroupSettings;
  auth: CardBorderGroupSettings;
}

export interface UiConfig {
  fonts: {
    arabic: string;
    english: string;
  };
  colors: {
    primary: string;
    cardBg: string;
    cardBgDark: string;
  };
  backgrounds: {
    light: string;
    dark: string;
    image: string;
  };
  sidebar: {
    backgroundImage: string;
  };
  splashScreen: {
    enabled: boolean;
    backgroundColor: string;
    logoUrl: string;
  };
  cardBorder: {
    enabled: boolean;
    color: string;
    colorDark: string;
    width: number;
    side: CardBorderSide;
    groups: CardBorderGroupsSettings;
  };
  sidebarBorder: {
    enabled: boolean;
    color: string;
    width: number;
  };
  videoThumbnails: {
    enabled: boolean;
  };
}

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";

export async function fetchUiConfig(): Promise<UiConfig> {
  const res = await api.get<UiConfig>("/ui-settings");
  return res.data ?? ({} as UiConfig);
}

export async function updateUiConfig(config: DeepPartial<UiConfig>): Promise<UiConfig> {
  const res = await api.put<UiConfig>("/ui-settings", config);
  return res.data ?? ({} as UiConfig);
}

export async function resetUiConfig(): Promise<UiConfig> {
  const res = await api.post<UiConfig>("/ui-settings/reset");
  return res.data ?? ({} as UiConfig);
}

export type UiImageKind = "background" | "sidebar";

export async function uploadUiImage(file: File, kind: UiImageKind): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);

  const res = await fetch(`${API_BASE_URL}/ui-settings/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : "تعذر رفع الصورة";
    throw new Error(message);
  }

  const url = (data as { data?: { url?: string } }).data?.url ?? "";
  if (!url) throw new Error("تعذر رفع الصورة");
  return url;
}
