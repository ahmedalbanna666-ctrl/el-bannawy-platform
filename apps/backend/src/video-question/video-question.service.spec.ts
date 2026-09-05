import { VideoQuestionService } from "./video-question.service";

describe("VideoQuestionService.update", () => {
  function setup() {
    const tx = {
      videoQuestion: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          id: "q-1",
          videoEventId: "evt-1",
          options: [],
        }),
      },
      videoQuestionOption: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      videoEvent: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: "q-1", videoEventId: "evt-1" }),
    };
    const mapper = { toDomain: jest.fn().mockReturnValue({ id: "q-1" }) };
    const service = new VideoQuestionService(
      prisma as never,
      repository as never,
      mapper as never,
      {} as never,
      {} as never,
    );
    return { tx, prisma, repository, mapper, service };
  }

  it("writes a retimed timestamp to the parent video event", async () => {
    const { tx, service } = setup();

    await service.update("q-1", {
      title: "Edited title",
      timestamp: 95,
      options: [{ text: "A", isCorrect: true, displayOrder: 0 }],
    });

    expect(tx.videoEvent.update).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: { timestamp: 95 },
    });
    expect(tx.videoQuestion.update).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: expect.objectContaining({ title: "Edited title" }),
    });
  });

  it("leaves the video event untouched when no timestamp is sent", async () => {
    const { tx, service } = setup();

    await service.update("q-1", { title: "Only title" });

    expect(tx.videoEvent.update).not.toHaveBeenCalled();
    expect(tx.videoQuestion.update).toHaveBeenCalled();
  });
});
