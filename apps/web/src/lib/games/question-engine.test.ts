import { describe, it, expect } from "vitest";
import { pronunciationScore } from "./question-engine";

describe("pronunciationScore", () => {
  it("gives a perfect score for an exact match", () => {
    expect(pronunciationScore("apple", "apple")).toBe(100);
  });

  it("gives a perfect score when the target appears inside the spoken phrase", () => {
    expect(pronunciationScore("apple", "the apple")).toBe(100);
    expect(pronunciationScore("apple", "apple the")).toBe(100);
  });

  it("is case and punctuation insensitive", () => {
    expect(pronunciationScore("Apple", "APPLE.")).toBe(100);
  });

  it("treats a correctly pronounced word with minor ASR noise as correct", () => {
    // single character off should still pass a 90 threshold
    expect(pronunciationScore("apple", "aple")).toBeGreaterThanOrEqual(90);
    expect(pronunciationScore("apple", "appel")).toBeGreaterThanOrEqual(90);
    expect(pronunciationScore("apple", "apples")).toBeGreaterThanOrEqual(90);
    expect(pronunciationScore("banana", "banan")).toBeGreaterThanOrEqual(90);
  });

  it("treats phonetically similar ASR output as a correct pronunciation", () => {
    // "school" is often heard by ASR as "skul" — the student pronounced it correctly
    expect(pronunciationScore("school", "skul")).toBeGreaterThanOrEqual(90);
    // "cat" vs "kat"
    expect(pronunciationScore("cat", "kat")).toBeGreaterThanOrEqual(90);
  });

  it("rewards a clearly wrong word with a low score", () => {
    expect(pronunciationScore("apple", "orange")).toBeLessThan(50);
    expect(pronunciationScore("apple", "banana")).toBeLessThan(50);
  });

  it("returns 0 when nothing was spoken", () => {
    expect(pronunciationScore("apple", "")).toBe(0);
    expect(pronunciationScore("apple", "   ")).toBe(0);
  });

  it("returns 0 for an empty target", () => {
    expect(pronunciationScore("", "apple")).toBe(0);
  });

  it("reflects the user-facing rule: the word shown on screen correct => correct", () => {
    const shown = "apple";
    const score = pronunciationScore("apple", shown);
    expect(score).toBe(100);
  });
});
