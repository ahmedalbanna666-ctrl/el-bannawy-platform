import { R2FileStorage, type R2StorageOptions } from "./r2-file-storage";

const mockSend = jest.fn();

function command(input: Record<string, unknown>): { input: Record<string, unknown> } {
  return { input };
}

const sdkMock = {
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => command(input)),
  GetObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => command(input)),
  DeleteObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => command(input)),
  HeadObjectCommand: jest.fn().mockImplementation((input: Record<string, unknown>) => command(input)),
};

jest.mock("@aws-sdk/client-s3", () => sdkMock);

describe("R2FileStorage", () => {
  const options: R2StorageOptions = {
    accountId: "test-account",
    accessKeyId: "AKIA",
    secretAccessKey: "secret",
    bucket: "elbannawy",
  };

  let storage: R2FileStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new R2FileStorage(options);
  });

  it("saves with a portable /files/<category>/<name> URL and correct object key", async () => {
    mockSend.mockResolvedValue({});

    const saved = await storage.save(Buffer.from("%PDF"), "lesson.pdf", "lesson-123", "documents");

    expect(saved.fileUrl).toBe("/files/documents/lesson-123.pdf");
    expect(saved.storedName).toBe("lesson-123.pdf");

    const putCall = mockSend.mock.calls[0][0].input;
    expect(putCall).toMatchObject({ Bucket: "elbannawy", Key: "documents/lesson-123.pdf" });
    expect(sdkMock.S3Client).toHaveBeenCalledWith(
      expect.objectContaining({ region: "auto", endpoint: "https://test-account.r2.cloudflarestorage.com" }),
    );
  });

  it("reads back the file bytes", async () => {
    mockSend.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array(Buffer.from("data")) } });

    const buffer = await storage.read("/files/documents/lesson-123.pdf");

    expect(buffer.toString()).toBe("data");
    const getCall = mockSend.mock.calls[0][0].input;
    expect(getCall).toMatchObject({ Bucket: "elbannawy", Key: "documents/lesson-123.pdf" });
  });

  it("exists returns true when head succeeds and false on error", async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await storage.exists("/files/documents/x.pdf")).toBe(true);

    mockSend.mockRejectedValueOnce(new Error("NotFound"));
    expect(await storage.exists("/files/documents/x.pdf")).toBe(false);
  });

  it("remove deletes by object key", async () => {
    mockSend.mockResolvedValue({});
    await storage.remove("/files/documents/x.pdf");
    const delCall = mockSend.mock.calls[0][0].input;
    expect(delCall).toMatchObject({ Bucket: "elbannawy", Key: "documents/x.pdf" });
  });

  it("handles multi-segment legacy URLs", () => {
    expect(storage.resolve("/files/certificates/user-1/cert.pdf")).toBe("certificates/user-1/cert.pdf");
  });
});
