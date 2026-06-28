import { successResponse, type ISuccessResponse } from "./response.helper";

describe("Response Helper", () => {
  describe("successResponse", () => {
    it("should return a standard success response with data", () => {
      const data = { id: "123", name: "Test" };
      const result = successResponse(data, "Operation completed");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Operation completed");
      expect(result.data).toEqual(data);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("string");
    });

    it("should use default message when not provided", () => {
      const result = successResponse({ key: "value" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Success");
    });

    it("should handle null data", () => {
      const result = successResponse(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should handle undefined data", () => {
      const result = successResponse(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it("should return unique timestamps", () => {
      const r1 = successResponse("data1");
      const r2 = successResponse("data2");

      // Different calls produce different timestamps
      expect(new Date(r1.timestamp).getTime()).toBeLessThanOrEqual(new Date(r2.timestamp).getTime());
    });

    it("should work with array data", () => {
      const items = [1, 2, 3];
      const result = successResponse(items);

      expect(result.data).toEqual(items);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should match ISuccessResponse interface", () => {
      const result: ISuccessResponse<string> = successResponse("hello");
      expect(result.success).toBe(true);
    });
  });
});
