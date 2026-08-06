import { describe, it, expect } from "vitest";
import { suggestEnglishName } from "./arabic-names";

describe("suggestEnglishName", () => {
  it("maps known Arabic triple names from the dataset", () => {
    expect(suggestEnglishName("أحمد حسن علي")).toBe("Ahmed Hassan Ali");
    expect(suggestEnglishName("محمد محمود خالد")).toBe("Mohamed Mahmoud Khaled");
    expect(suggestEnglishName("فاطمة زينب سارة")).toBe("Fatma Zeinab Sara");
  });

  it("normalizes Arabic spelling variants before lookup", () => {
    expect(suggestEnglishName("احمد")).toBe("Ahmed");
    expect(suggestEnglishName("إبراهيم يوسف")).toBe("Ibrahim Youssef");
    expect(suggestEnglishName("عبدالرحمن حسن علي")).toBe("Abdulrahman Hassan Ali");
  });

  it("falls back to phonetic transliteration for unknown names", () => {
    const result = suggestEnglishName("قزقز فلان علان");
    expect(result).not.toBe("");
    expect(result.split(" ")).toHaveLength(3);
  });

  it("returns empty string for empty input", () => {
    expect(suggestEnglishName("")).toBe("");
    expect(suggestEnglishName("   ")).toBe("");
  });
});
