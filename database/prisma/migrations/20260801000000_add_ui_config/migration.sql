-- Add UiConfig table for admin UI customization
CREATE TABLE "ui_config" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL DEFAULT 'default',
  "label" TEXT NOT NULL DEFAULT 'UI Configuration',
  "config" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ui_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ui_config_key_key" UNIQUE ("key")
);

-- Seed default UI config
INSERT INTO "ui_config" ("key", "label", "config")
VALUES (
  'default',
  'UI Configuration',
  '{
    "fonts": {
      "arabic": "Cairo, Noto Sans Arabic, sans-serif",
      "english": "Inter, system-ui, Arial, sans-serif"
    },
    "colors": {
      "primary": "#06b6d4",
      "cardBg": "#ffffff",
      "cardBgDark": "rgba(12,18,30,0.94)"
    },
    "backgrounds": {
      "light": "#f8fafc",
      "dark": "#0a0e1a"
    },
    "splashScreen": {
      "enabled": true,
      "backgroundColor": "#0a0e1a",
      "logoUrl": ""
    },
    "cardBorder": {
      "enabled": true,
      "color": "rgba(34,211,238,0.25)",
      "width": 4,
      "side": "left"
    },
    "sidebarBorder": {
      "enabled": true,
      "color": "rgba(255,255,255,0.1)",
      "width": 1
    }
  }'::jsonb
);
