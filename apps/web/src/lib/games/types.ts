export interface GameWord {
  readonly word: string;
  readonly translation: string;
}

export interface GameUnitOption {
  readonly id: string;
  readonly title: string;
  readonly gradeName: string;
  readonly isPremium: boolean;
  readonly lessonIds: string[];
}

export interface ListeningQuestion {
  readonly word: string;
  readonly options: string[];
  readonly correctTranslation: string;
}

export interface ListeningChallengeSettings {
  readonly enabled: boolean;
  readonly replayLimit: number;
  readonly questionsPerRound: number;
}

export interface PronunciationChallengeSettings {
  readonly enabled: boolean;
  readonly threshold: number;
  readonly xpReward: number;
  readonly coinReward: number;
  readonly questionsPerRound: number;
}

export interface PronunciationQuestion {
  readonly word: string;
  readonly translation: string;
}

export interface MemoryGameSettings {
  readonly enabled: boolean;
  readonly wordsPerRound: number;
}

export interface GameSettingsStore {
  readonly listeningChallenge: ListeningChallengeSettings;
  readonly pronunciationChallenge: PronunciationChallengeSettings;
  readonly memoryGame: MemoryGameSettings;
}
