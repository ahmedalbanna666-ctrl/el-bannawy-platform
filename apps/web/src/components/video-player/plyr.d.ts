interface PlyrOptions {
  controls?: string[];
  youtube?: Record<string, unknown>;
  poster?: string;
  ratio?: string;
  resetOnEnd?: boolean;
  clickToPlay?: boolean;
  hideControls?: boolean;
  tooltips?: Record<string, boolean>;
}

declare class Plyr {
  constructor(selector: string | HTMLElement, options?: PlyrOptions);
  currentTime: number;
  readonly duration: number;
  muted: boolean;
  volume: number;
  play(): void;
  pause(): void;
  restart(): void;
  destroy(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
}
