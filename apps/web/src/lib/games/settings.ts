import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  GameSettingsStore,
  ListeningChallengeSettings,
  MemoryGameSettings,
  PronunciationChallengeSettings,
} from "./types";

const STORAGE_KEY = "el-bannawy-games-settings";

const DEFAULT_SETTINGS: GameSettingsStore = {
  listeningChallenge: {
    enabled: true,
    replayLimit: 3,
    questionsPerRound: 10,
  },
  pronunciationChallenge: {
    enabled: true,
    threshold: 90,
    xpReward: 5,
    coinReward: 2,
    questionsPerRound: 10,
  },
  memoryGame: {
    enabled: true,
    wordsPerRound: 12,
  },
};

function mergeSettings(base: GameSettingsStore, patch: Partial<GameSettingsStore>): GameSettingsStore {
  return {
    listeningChallenge: {
      ...base.listeningChallenge,
      ...(patch.listeningChallenge ?? {}),
    },
    pronunciationChallenge: {
      ...base.pronunciationChallenge,
      ...(patch.pronunciationChallenge ?? {}),
    },
    memoryGame: {
      ...base.memoryGame,
      ...(patch.memoryGame ?? {}),
    },
  };
}

function readSettings(): GameSettingsStore {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettingsStore>;
    return mergeSettings(DEFAULT_SETTINGS, parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: GameSettingsStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useGameSettings(): {
  settings: GameSettingsStore;
  isLoading: boolean;
  updateListening: (patch: Partial<ListeningChallengeSettings>) => void;
  updatePronunciation: (patch: Partial<PronunciationChallengeSettings>) => void;
  updateMemory: (patch: Partial<MemoryGameSettings>) => void;
} {
  const [settings, setSettings] = useState<GameSettingsStore>(readSettings);
  const [isLoading, setIsLoading] = useState(true);

  const { data } = useQuery<GameSettingsStore | null>({
    queryKey: ["games-settings"],
    queryFn: async () => {
      const res = await api.get<GameSettingsStore>("/games/settings");
      return res.data ?? null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      const merged = mergeSettings(readSettings(), data);
      setSettings(merged);
      writeSettings(merged);
    }
    setIsLoading(false);
  }, [data]);

  const updateListening = useCallback(
    (patch: Partial<ListeningChallengeSettings>): void => {
      setSettings((prev) => {
        const next = {
          ...prev,
          listeningChallenge: { ...prev.listeningChallenge, ...patch },
        };
        writeSettings(next);
        return next;
      });
      api.patch("/games/settings", { listeningChallenge: patch }).catch((): void => {
        // Local-only fallback when the backend is unreachable.
      });
    },
    [],
  );

  const updatePronunciation = useCallback(
    (patch: Partial<PronunciationChallengeSettings>): void => {
      setSettings((prev) => {
        const next = {
          ...prev,
          pronunciationChallenge: { ...prev.pronunciationChallenge, ...patch },
        };
        writeSettings(next);
        return next;
      });
      api.patch("/games/settings", { pronunciationChallenge: patch }).catch((): void => {
        // Local-only fallback when the backend is unreachable.
      });
    },
    [],
  );

  const updateMemory = useCallback(
    (patch: Partial<MemoryGameSettings>): void => {
      setSettings((prev) => {
        const next = {
          ...prev,
          memoryGame: { ...prev.memoryGame, ...patch },
        };
        writeSettings(next);
        return next;
      });
      api.patch("/games/settings", { memoryGame: patch }).catch((): void => {
        // Local-only fallback when the backend is unreachable.
      });
    },
    [],
  );

  return {
    settings,
    isLoading,
    updateListening,
    updatePronunciation,
    updateMemory,
  };
}
