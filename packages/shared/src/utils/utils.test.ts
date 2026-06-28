import { generateTimestamp, clamp, paginate, isNullOrUndefined, isEmpty } from "./index";

describe("Shared Utils", () => {
  describe("generateTimestamp", () => {
    it("should return a valid ISO string", () => {
      const ts = generateTimestamp();
      const date = new Date(ts);
      expect(date.toISOString()).toBe(ts);
    });

    it("should return the current date and time", () => {
      const before = Date.now();
      const ts = generateTimestamp();
      const after = Date.now();
      const parsed = new Date(ts).getTime();
      expect(parsed).toBeGreaterThanOrEqual(before);
      expect(parsed).toBeLessThanOrEqual(after);
    });
  });

  describe("clamp", () => {
    it("should clamp a value below minimum", () => {
      expect(clamp(-5, 0, 100)).toBe(0);
    });

    it("should clamp a value above maximum", () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it("should return value when within range", () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it("should handle edge case at exact min", () => {
      expect(clamp(0, 0, 100)).toBe(0);
    });

    it("should handle edge case at exact max", () => {
      expect(clamp(100, 0, 100)).toBe(100);
    });
  });

  describe("paginate", () => {
    it("should return pagination metadata", () => {
      const result = paginate(1, 3, 10);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(3);
      expect(result.totalPages).toBe(4);
    });

    it("should handle last page correctly", () => {
      const result = paginate(4, 3, 10);
      expect(result.skip).toBe(9);
      expect(result.totalPages).toBe(4);
    });

    it("should clamp page to at least 1", () => {
      const result = paginate(0, 5, 20);
      expect(result.skip).toBe(0);
    });

    it("should clamp limit between 1 and 100", () => {
      const result = paginate(1, 200, 100);
      expect(result.take).toBe(100);
    });
  });

  describe("isNullOrUndefined", () => {
    it("should return true for null", () => {
      expect(isNullOrUndefined(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isNullOrUndefined(undefined)).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isNullOrUndefined("")).toBe(false);
    });

    it("should return false for zero", () => {
      expect(isNullOrUndefined(0)).toBe(false);
    });

    it("should return false for false", () => {
      expect(isNullOrUndefined(false)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isNullOrUndefined({})).toBe(false);
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("should return true for whitespace string", () => {
      expect(isEmpty("   ")).toBe(true);
    });

    it("should return false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
    });

    it("should return true for null", () => {
      expect(isEmpty(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isEmpty(undefined)).toBe(true);
    });
  });
});
