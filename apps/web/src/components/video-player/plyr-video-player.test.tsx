import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlyrVideoPlayer } from "./plyr-video-player";
import type { VideoEvent, QuestionData } from "./types";

// ── Mocks ─────────────────────────────────────────────────────────────

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: apiMock,
}));

vi.mock("next/script", () => ({
  default: (): null => null,
}));

vi.mock("./video-question-modal", () => ({
  VideoQuestionModal: ({
    question,
    onComplete,
    onSkip,
  }: {
    question: QuestionData;
    onComplete: (resume: boolean) => void;
    onSkip: () => void;
  }): ReactNode => (
    <div data-testid="question-modal">
      <span>{question.title}</span>
      <button onClick={() => { onComplete(true); }}>إجابة</button>
      <button onClick={onSkip}>تخطي</button>
    </div>
  ),
}));

// ── Mock Plyr ─────────────────────────────────────────────────────────

interface MockPlyrInstance {
  currentTime: number;
  duration: number;
  on: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  restart: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  handlers: Record<string, (() => void) | undefined>;
  options: Record<string, unknown>;
  fire: (event: string) => void;
}

const instances: MockPlyrInstance[] = [];

class MockPlyr {
  static last: MockPlyrInstance | null = null;
  currentTime = 0;
  duration = 100;
  on = vi.fn((event: string, cb: () => void) => { this.handlers[event] = cb; });
  play = vi.fn();
  pause = vi.fn();
  restart = vi.fn();
  destroy = vi.fn();
  handlers: Record<string, (() => void) | undefined> = {};
  options: Record<string, unknown>;

  constructor(_el: HTMLElement, options: Record<string, unknown>) {
    this.options = options;
    instances.push(this);
    MockPlyr.last = this;
  }

  fire(event: string): void {
    this.handlers[event]?.();
  }
}

(globalThis as unknown as Record<string, unknown>).Plyr = MockPlyr;

// ── Test data ─────────────────────────────────────────────────────────

const requiredQuestion: VideoEvent = {
  id: "evt-1",
  type: "QUESTION",
  timestamp: 30,
  title: "سؤال إجباري",
  description: "",
  required: true,
  enabled: true,
  displayOrder: 1,
  payload: {},
};

const optionalQuestion: VideoEvent = {
  id: "evt-2",
  type: "QUESTION",
  timestamp: 60,
  title: "سؤال اختياري",
  description: "",
  required: false,
  enabled: true,
  displayOrder: 2,
  payload: {},
};

const questionData: QuestionData = {
  id: "q-1",
  videoEventId: "evt-1",
  type: "MULTIPLE_CHOICE",
  title: "What is 2+2?",
  instructions: null,
  options: [{ id: "a", text: "3", displayOrder: 1 }, { id: "b", text: "4", displayOrder: 2 }],
};

function mockApi(events: VideoEvent[]): void {
  apiMock.get.mockImplementation((url: string) => {
    if (url.startsWith("/video-events")) {
      return Promise.resolve({ data: events });
    }
    if (url.startsWith("/video-questions/by-video-event/")) {
      return Promise.resolve({ data: questionData });
    }
    return Promise.resolve({ data: null });
  });
  apiMock.patch.mockResolvedValue({ data: {} });
  apiMock.post.mockResolvedValue({ data: {} });
}

function getPlayer(): MockPlyrInstance {
  const p = MockPlyr.last;
  if (!p) throw new Error("Plyr instance not created");
  return p;
}

beforeEach(() => {
  instances.length = 0;
  MockPlyr.last = null;
  apiMock.get.mockReset();
  apiMock.patch.mockReset();
  apiMock.post.mockReset();
  mockApi([requiredQuestion, optionalQuestion]);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("PlyrVideoPlayer", () => {
  it("initializes Plyr with native controls disabled and renders the custom control bar", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    // Native Plyr controls are disabled — we render our own two-row bar.
    expect(player.options.controls).toEqual([]);
    // The custom control bar is rendered.
    await waitFor(() => { expect(document.querySelector(".elb-ctrl")).toBeTruthy(); });
    // The player must load the video events and render question markers.
    await waitFor(() => { expect(apiMock.get).toHaveBeenCalledWith("/video-events?videoId=vid-1"); });
  });

  it("does NOT fire a timeline question before playback starts", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    // Video reports time but the player is NOT playing yet.
    const player = getPlayer();
    player.currentTime = 60;
    player.fire("timeupdate");

    await waitFor(() => { expect(apiMock.get).toHaveBeenCalledWith("/video-events?videoId=vid-1"); });
    // Advance past the interval enough to trigger the timeline check.
    await new Promise((r) => setTimeout(r, 800));

    expect(apiMock.get).not.toHaveBeenCalledWith("/video-questions/by-video-event/evt-1");
    expect(screen.queryByTestId("question-modal")).not.toBeInTheDocument();
  });

  it("fires the sudden question at its timestamp while playing and pauses the video", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("play");
    player.currentTime = 30;
    player.fire("timeupdate");

    await waitFor(
      () => { expect(apiMock.get).toHaveBeenCalledWith("/video-questions/by-video-event/evt-1"); },
      { timeout: 3000 },
    );

    // The video must pause the moment the question is triggered.
    expect(player.pause).toHaveBeenCalled();
    expect(screen.getByTestId("question-modal")).toBeInTheDocument();
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
  });

  it("answers the question and resumes playback", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("play");
    player.currentTime = 30;
    player.fire("timeupdate");

    await waitFor(() => { expect(screen.getByTestId("question-modal")).toBeInTheDocument(); }, { timeout: 3000 });

    fireEvent.click(screen.getByText("إجابة"));

    expect(player.play).toHaveBeenCalled();
    await waitFor(() => { expect(screen.queryByTestId("question-modal")).not.toBeInTheDocument(); });
  });

  it("pulls the student back to a skipped mandatory question on fast-forward", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("play");
    // Student fast-forwards past the mandatory question at 30s to 60s.
    player.currentTime = 60;
    player.fire("seeked");

    // The mandatory question must be fired immediately and the video paused.
    await waitFor(
      () => { expect(apiMock.get).toHaveBeenCalledWith("/video-questions/by-video-event/evt-1"); },
      { timeout: 3000 },
    );
    expect(player.pause).toHaveBeenCalled();
    expect(screen.getByTestId("question-modal")).toBeInTheDocument();
  });

  it("does NOT fire an already-answered mandatory question twice on re-seek", async () => {
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("play");
    player.currentTime = 30;
    player.fire("timeupdate");

    await waitFor(() => { expect(screen.getByTestId("question-modal")).toBeInTheDocument(); }, { timeout: 3000 });
    fireEvent.click(screen.getByText("إجابة"));

    // Seek back and forth past the answered question again.
    player.currentTime = 40;
    player.fire("timeupdate");
    player.fire("seeked");
    await new Promise((r) => setTimeout(r, 700));

    // The question data should only have been fetched once.
    expect(apiMock.get).toHaveBeenCalledTimes(2); // events list + first question fetch
  });

  it("pulls back to the EARLIEST unanswered question when seeking past several", async () => {
    // Two mandatory questions: one at 30s, one at 60s.
    mockApi([requiredQuestion, { ...optionalQuestion, id: "evt-3", required: true, timestamp: 60 }]);
    render(<PlyrVideoPlayer providerVideoId="xyz123" videoId="vid-1" />);
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("play");
    // Student scrubs straight to 90s, past BOTH unanswered questions.
    player.currentTime = 90;
    player.fire("timeupdate");
    player.fire("seeked");
    await new Promise((r) => setTimeout(r, 300));

    // The earliest unanswered question (30s) must be fired, not the latest.
    expect(apiMock.get).toHaveBeenCalledWith(
      expect.stringContaining("/video-questions/by-video-event/evt-1"),
    );
    expect(screen.getByTestId("question-modal")).toBeInTheDocument();
  });

  it("marks the video complete on end when enabled", async () => {
    render(
      <PlyrVideoPlayer
        providerVideoId="xyz123"
        videoId="vid-1"
        enableLessonCompleted
      />,
    );
    await waitFor(() => { expect(MockPlyr.last).toBeTruthy(); });

    const player = getPlayer();
    player.fire("ended");

    await waitFor(() => { expect(apiMock.post).toHaveBeenCalledWith("/videos/vid-1/complete"); });
  });
});
