"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUiConfig, updateUiConfig, resetUiConfig, type UiConfig } from "@/lib/ui-settings-api";
import { useEffect, type ReactNode } from "react";

const UI_CONFIG_QUERY_KEY = ["ui-config"] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function shift(color: string, factor: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const mix = (channel: number): number =>
    factor >= 0
      ? Math.round(channel + (255 - channel) * factor)
      : Math.round(channel * (1 + factor));
  const toHex = (v: number): string => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

function applyConfig(config: UiConfig): void {
  const root = document.documentElement;

  root.style.setProperty("--font-ui-arabic", config.fonts.arabic);
  root.style.setProperty("--font-ui-english", config.fonts.english);

  root.style.setProperty("--ui-card-bg", config.colors.cardBg);
  root.style.setProperty("--ui-card-bg-dark", config.colors.cardBgDark);

  root.style.setProperty("--ui-bg-light", config.backgrounds.light);
  root.style.setProperty("--ui-bg-dark", config.backgrounds.dark);

  const bgImage = config.backgrounds.image.trim();
  root.style.setProperty("--ui-bg-image", bgImage ? `url("${bgImage}")` : "none");
  root.style.setProperty(
    "--ui-bg-image-overlay",
    bgImage
      ? "linear-gradient(180deg, rgba(5,8,16,0.82) 0%, rgba(5,8,16,0.45) 50%, rgba(5,8,16,0.86) 100%)"
      : "none",
  );

  const sidebarImage = config.sidebar.backgroundImage.trim();
  root.style.setProperty("--ui-sidebar-bg-image", sidebarImage ? `url("${sidebarImage}")` : "none");
  root.style.setProperty(
    "--ui-sidebar-bg-image-overlay",
    sidebarImage
      ? "linear-gradient(180deg, rgba(4,7,15,0.85) 0%, rgba(4,7,15,0.55) 50%, rgba(4,7,15,0.88) 100%)"
      : "none",
  );

  root.style.setProperty("--ui-sidebar-border-color", config.sidebarBorder.color);
  root.style.setProperty("--ui-sidebar-border-width", `${String(config.sidebarBorder.width)}px`);

  root.style.setProperty("--ui-splash-bg", config.splashScreen.backgroundColor);
  root.style.setProperty("--ui-splash-logo", config.splashScreen.logoUrl || "none");

  const primary = config.colors.primary;
  if (hexToRgb(primary)) {
    root.style.setProperty("--color-primary-300", shift(primary, 0.45));
    root.style.setProperty("--color-primary-400", shift(primary, 0.18));
    root.style.setProperty("--color-primary-500", primary);
    root.style.setProperty("--color-primary-600", shift(primary, -0.22));
    root.style.setProperty("--color-primary-700", shift(primary, -0.4));
  }
}

export function useUiSettings(): {
  config: UiConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  update: (config: Partial<UiConfig>) => Promise<UiConfig>;
  reset: () => Promise<UiConfig>;
} {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError } = useQuery({
    queryKey: UI_CONFIG_QUERY_KEY,
    queryFn: fetchUiConfig,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (config) {
      applyConfig(config);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: updateUiConfig,
    onSuccess: (newConfig) => {
      applyConfig(newConfig);
      queryClient.setQueryData(UI_CONFIG_QUERY_KEY, newConfig);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetUiConfig,
    onSuccess: (newConfig) => {
      applyConfig(newConfig);
      queryClient.setQueryData(UI_CONFIG_QUERY_KEY, newConfig);
    },
  });

  return {
    config,
    isLoading,
    isError,
    update: async (partial: Partial<UiConfig>): Promise<UiConfig> => {
      const result = await updateMutation.mutateAsync(partial);
      return result;
    },
    reset: async (): Promise<UiConfig> => {
      const result = await resetMutation.mutateAsync();
      return result;
    },
  };
}

export function UiSettingsProvider({ children }: { children: ReactNode }): ReactNode {
  useUiSettings();
  return <>{children}</>;
}
