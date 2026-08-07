import { describe, it, expect } from "vitest";
import { LIVE_PRODUCTS, LIVE_PRODUCT_SESSIONS, liveProductCode, liveProductType } from "./live-shop-api";

describe("liveProductType", () => {
  it("maps every product code to its LIVE_* product type", () => {
    for (const code of LIVE_PRODUCTS) {
      expect(liveProductType(code)).toBe(`LIVE_${code}`);
    }
  });

  it("maps FREE to LIVE_FREE (no double prefix)", () => {
    expect(liveProductType("FREE")).toBe("LIVE_FREE");
  });
});

describe("liveProductCode", () => {
  it("reverses a valid LIVE_* product type", () => {
    expect(liveProductCode("LIVE_PRIVATE_PLAN_A")).toBe("PRIVATE_PLAN_A");
    expect(liveProductCode("LIVE_GROUP_PLAN_B")).toBe("GROUP_PLAN_B");
    expect(liveProductCode("LIVE_FREE")).toBe("FREE");
  });

  it("returns null for unknown prefixes and formats", () => {
    expect(liveProductCode("PRIVATE_PLAN_A")).toBeNull();
    expect(liveProductCode("LIVE_UNKNOWN")).toBeNull();
    expect(liveProductCode("")).toBeNull();
    expect(liveProductCode("group")).toBeNull();
  });
});

describe("LIVE_PRODUCT_SESSIONS", () => {
  it("defines session counts for every product", () => {
    for (const code of LIVE_PRODUCTS) {
      expect(typeof LIVE_PRODUCT_SESSIONS[code]).toBe("number");
    }
  });

  it("matches the documented plan sizing", () => {
    expect(LIVE_PRODUCT_SESSIONS.PRIVATE_PLAN_A).toBe(4);
    expect(LIVE_PRODUCT_SESSIONS.PRIVATE_PLAN_B).toBe(8);
    expect(LIVE_PRODUCT_SESSIONS.GROUP_PLAN_A).toBe(4);
    expect(LIVE_PRODUCT_SESSIONS.GROUP_PLAN_B).toBe(8);
    expect(LIVE_PRODUCT_SESSIONS.ONE_TIME).toBe(1);
    expect(LIVE_PRODUCT_SESSIONS.FREE).toBe(0);
  });
});
