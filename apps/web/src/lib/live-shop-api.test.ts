import { describe, it, expect } from "vitest";
import { LIVE_PRODUCTS, liveProductCode, liveProductType } from "./live-shop-api";

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

  it("accepts admin-created custom plan codes", () => {
    expect(liveProductCode("LIVE_CUSTOM_INTENSIVE")).toBe("CUSTOM_INTENSIVE");
  });

  it("returns null for unknown prefixes and formats", () => {
    expect(liveProductCode("PRIVATE_PLAN_A")).toBeNull();
    expect(liveProductCode("")).toBeNull();
    expect(liveProductCode("group")).toBeNull();
    expect(liveProductCode("LIVE_")).toBeNull();
  });
});
