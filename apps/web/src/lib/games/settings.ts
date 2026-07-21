import { useEffect, useState } from "react";
import type {
  GameSettingsStore,
  ListeningChallengeSettings,
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
};

function readSettings(): GameSettingsStore {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettingsStore>;
    return {
      listeningChallenge: {
        ...DEFAULT_SETTINGS.listeningChallenge,
        ...parsed.listeningChallenge,
      },
      pronunciationChallenge: {
        ...DEFAULT_SETTINGS.pronunciationChallenge,
        ...parsed.pronunciationChallenge,
      },
    };
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
  updateListening: (patch: Partial<ListeningChallengeSettings>) => void;
  updatePronunciation: (patch: Partial<PronunciationChallengeSettings>) => void;
} {
  const [settings, setSettings] = useState<GameSettingsStore>(readSettings);

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  const updateListening = (patch: Partial<ListeningChallengeSettings>): void => {
    setSettings((prev) => ({
      ...prev,
      listeningChallenge: {
        ...prev.listeningChallenge,
        ...patch,
      },
    }));
  };

  const updatePronunciation = (patch: Partial<PronunciationChallengeSettings>): void => {
    setSettings((prev) => ({
      ...prev,
      pronunciationChallenge: {
        ...prev.pronunciationChallenge,
        ...patch,
      },
    }));
  };

  return { settings, updateListening, updatePronunciation };
}
