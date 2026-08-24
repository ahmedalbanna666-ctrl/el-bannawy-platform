import { isCoTDump } from "./cot-guard";

describe("isCoTDump", () => {
  it("detects reasoning / thinking-process dumps", () => {
    expect(isCoTDump("Here's a thinking process:\n\n1. Analyze the request...")).toBe(true);
    expect(isCoTDump("thinking process: let me reason about this")).toBe(true);
    expect(isCoTDump("Analyze User Input: the user asked for a grammar tip")).toBe(true);
    expect(isCoTDump("Let me think this through before answering.")).toBe(true);
    expect(isCoTDump("step-by-step thinking:\n- first")).toBe(true);
  });

  it("does not flag normal tutor replies", () => {
    expect(isCoTDump("**Make** بنستخدمها لما بنعمل حاجة جديدة.")).toBe(false);
    expect(isCoTDump("أهلاً بك يا طالب! الماضي البسيط هو زمن الماضي.")).toBe(false);
    expect(isCoTDump("Okay, let's break this down simply: use 'make' for...")).toBe(false);
    expect(isCoTDump("The past simple tense is used for completed actions.")).toBe(false);
  });

  it("returns false for empty or whitespace content", () => {
    expect(isCoTDump("")).toBe(false);
    expect(isCoTDump("   ")).toBe(false);
  });
});
