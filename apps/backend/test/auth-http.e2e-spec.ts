import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { cleanDb, closeTestDb, getTestDb } from "./helpers/test-db";
import { createTestUser } from "./helpers/test-factory";

describe("Auth HTTP (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getTestDb();

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(cookieParser("el-bannawy-cookie-secret"));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await cleanDb("users", "refresh_tokens", "sessions", "login_history");
  }, 15000);

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  }, 15000);

  describe("POST /api/v1/auth/register", () => {
    it("registers a new student and requests email verification", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ fullName: "Test Student", email: "http-student@example.com", mobile: "+201000000001", password: "StrongP@ss1", confirmPassword: "StrongP@ss1" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("userId");
      expect(res.body.data).toHaveProperty("requiresEmailVerification", true);
    }, 10000);

    it("rejects duplicate email", async () => {
      await createTestUser(prisma, { email: "http-dupe@example.com" });

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ fullName: "Dupe", email: "http-dupe@example.com", mobile: "+201000000001", password: "StrongP@ss1", confirmPassword: "StrongP@ss1" })
        .expect(409);

      expect(res.body.message).toContain("already registered");
    }, 10000);
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in with valid mobile", async () => {
      await createTestUser(prisma, { mobileNumber: "+201099999999", password: "Test@1234" });

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ identity: "+201099999999", password: "Test@1234" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("userId");
      expect(res.headers["set-cookie"]).toBeDefined();
    }, 10000);

    it("rejects wrong password", async () => {
      await createTestUser(prisma, { mobileNumber: "+201088888888", password: "Test@1234" });

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ identity: "+201088888888", password: "WrongPass1" })
        .expect(401);

      expect(res.body.message).toContain("Invalid");
    }, 10000);
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns user profile with valid cookie", async () => {
      const user = await createTestUser(prisma, { mobileNumber: "+201055555555", password: "Test@1234" });

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ identity: "+201055555555", password: "Test@1234" });

      const cookies = (loginRes.headers["set-cookie"] as unknown as string[]).join("; ");

      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Cookie", cookies)
        .expect(200);

      expect(res.body.data).toHaveProperty("id", user.id);
    }, 10000);

    it("rejects unauthenticated request", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .expect(401);
    }, 10000);
  });
});
