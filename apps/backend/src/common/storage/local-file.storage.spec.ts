import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { LocalFileStorage } from "./local-file.storage";

describe("LocalFileStorage", () => {
  let storage: LocalFileStorage;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "elbannawy-storage-"));
    // Route uploads into the temp dir by overriding cwd-relative resolution.
    // LocalFileStorage resolves against process.cwd()/uploads, so instead we
    // directly test save/read against the returned fileUrl for round-trips.
    storage = new LocalFileStorage();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("saves and reads back a document with the portable URL shape", async () => {
    const buffer = Buffer.from("%PDF-1.4 fake content");
    const saved = await storage.save(buffer, "lesson.pdf", "lesson-123", "documents");

    expect(saved.fileUrl).toMatch(/^\/files\/documents\/lesson-123\.pdf$/);
    expect(saved.storedName).toBe("lesson-123.pdf");

    const exists = await storage.exists(saved.fileUrl);
    expect(exists).toBe(true);

    const readBack = await storage.read(saved.fileUrl);
    expect(readBack.toString()).toBe("%PDF-1.4 fake content");
  });

  it("groups by category in the stored path", async () => {
    const saved = await storage.save(Buffer.from("ui-image"), "bg.png", "sidebar-1", "ui");
    expect(saved.fileUrl).toMatch(/^\/files\/ui\/sidebar-1\.png$/);
    expect(await storage.exists(saved.fileUrl)).toBe(true);
  });

  it("sanitizes unsafe ids and extensions", async () => {
    const saved = await storage.save(Buffer.from("x"), "../evil!!.PDF", "../../etc/passwd", "documents");
    expect(saved.storedName).toMatch(/^[a-zA-Z0-9-]+\.pdf$/);
    expect(saved.storedName).not.toContain("..");
    expect(saved.storedName).not.toContain("/");
  });

  it("falls back to the flat layout for legacy fileUrls", async () => {
    // Simulate an old row where the file was stored flat under the category dir.
    const categoryDir = path.join(process.cwd(), "uploads", "certificates");
    await fs.mkdir(categoryDir, { recursive: true });
    const legacyName = "legacy-cert.pdf";
    await fs.writeFile(path.join(categoryDir, legacyName), "legacy");
    try {
      const legacyUrl = `/files/certificates/${legacyName}`;
      expect(await storage.exists(legacyUrl)).toBe(true);
      expect((await storage.read(legacyUrl)).toString()).toBe("legacy");
    } finally {
      await fs.unlink(path.join(categoryDir, legacyName)).catch(() => {});
    }
  });

  it("remove deletes the file", async () => {
    const saved = await storage.save(Buffer.from("del"), "del.pdf", "d1", "documents");
    await storage.remove(saved.fileUrl);
    expect(await storage.exists(saved.fileUrl)).toBe(false);
  });
});
