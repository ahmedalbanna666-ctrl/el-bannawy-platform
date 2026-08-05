import { Test, type TestingModule } from "@nestjs/testing";
import { ZoomService } from "./zoom.service";
import { ConfigurationService } from "../config/configuration.service";
import { PrismaService } from "../prisma/prisma.service";

const zoomConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  sdkKey: "",
  sdkSecret: "",
  oauthBaseUrl: "https://zoom.us/oauth/token",
  authorizeBaseUrl: "https://zoom.us/oauth/authorize",
  redirectUri: "https://backend.test/api/v1/zoom/oauth/callback",
  apiBaseUrl: "https://api.zoom.us/v2",
  sdkSignatureUrl: "https://zoom.us/sdk/signature",
  signatureTtlSeconds: 7200,
};

describe("ZoomService", () => {
  let service: ZoomService;
  let prisma: {
    systemSetting: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let fetchMock: jest.Mock;

  const tokenResponse = (overrides: Record<string, unknown> = {}) => ({
    ok: true,
    json: async () => ({
      access_token: "access-1",
      expires_in: 3600,
      ...overrides,
    }),
  });

  beforeEach(async () => {
    prisma = {
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoomService,
        { provide: ConfigurationService, useValue: { zoom: zoomConfig } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ZoomService>(ZoomService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getAuthorizationUrl", () => {
    it("builds the Zoom authorize URL with client id, redirect and state", () => {
      const url = service.getAuthorizationUrl("state-1");
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe("https://zoom.us/oauth/authorize");
      expect(parsed.searchParams.get("client_id")).toBe("client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(zoomConfig.redirectUri);
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("state")).toBe("state-1");
    });
  });

  describe("getAccessToken", () => {
    it("uses the client-credentials grant when no refresh token is stored", async () => {
      fetchMock.mockResolvedValue(tokenResponse({ access_token: "access-cc" }));

      const token = await service.getAccessToken();

      expect(token).toBe("access-cc");
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
      expect(body.get("grant_type")).toBe("client_credentials");
      expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("uses the refresh-token grant and persists the rotated token", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: JSON.stringify({
          accessToken: "access-old",
          refreshToken: "refresh-1",
          expiresAt: Date.now() + 60_000,
        }),
      });
      fetchMock.mockResolvedValue(
        tokenResponse({ access_token: "access-2", refresh_token: "refresh-2" }),
      );

      const token = await service.getAccessToken();

      expect(token).toBe("access-2");
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("refresh-1");
      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { value: expect.stringContaining("refresh-2") },
        }),
      );
    });

    it("returns the cached token within its lifetime", async () => {
      fetchMock.mockResolvedValue(tokenResponse({ access_token: "access-cached" }));
      await service.getAccessToken();
      await service.getAccessToken();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("exchangeAuthorizationCode", () => {
    it("exchanges the code, persists tokens and returns them", async () => {
      fetchMock.mockResolvedValue(
        tokenResponse({ access_token: "access-code", refresh_token: "refresh-code" }),
      );

      const tokens = await service.exchangeAuthorizationCode("auth-code");

      expect(tokens.accessToken).toBe("access-code");
      expect(tokens.refreshToken).toBe("refresh-code");
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("auth-code");
      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            key: "zoom_oauth_tokens",
            value: expect.stringContaining("refresh-code"),
          }),
        }),
      );
    });
  });

  describe("isOAuthAuthorized", () => {
    it("is false when no tokens are stored", async () => {
      expect(await service.isOAuthAuthorized()).toBe(false);
    });

    it("is true when a refresh token is stored", async () => {
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: JSON.stringify({
          accessToken: "access",
          refreshToken: "refresh",
          expiresAt: Date.now() + 60_000,
        }),
      });
      expect(await service.isOAuthAuthorized()).toBe(true);
    });
  });
});
