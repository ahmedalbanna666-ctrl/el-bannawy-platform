import { parseWord, type ParsedWord } from "./word-normalizer";

describe("word-normalizer", () => {
  describe("parseWord", () => {
    it("extracts trailing (n)", () => {
      const result = parseWord("parade (n)");
      expect(result.word).toBe("parade");
      expect(result.partOfSpeech).toBe("n");
    });

    it("extracts trailing (v)", () => {
      const result = parseWord("bury (v)");
      expect(result.word).toBe("bury");
      expect(result.partOfSpeech).toBe("v");
    });

    it("extracts trailing (adj)", () => {
      const result = parseWord("royal (adj)");
      expect(result.word).toBe("royal");
      expect(result.partOfSpeech).toBe("adj");
    });

    it("extracts trailing (adv)", () => {
      const result = parseWord("quickly (adv)");
      expect(result.word).toBe("quickly");
      expect(result.partOfSpeech).toBe("adv");
    });

    it("extracts trailing (prep)", () => {
      const result = parseWord("under (prep)");
      expect(result.word).toBe("under");
      expect(result.partOfSpeech).toBe("prep");
    });

    it("extracts trailing (pron)", () => {
      const result = parseWord("she (pron)");
      expect(result.word).toBe("she");
      expect(result.partOfSpeech).toBe("pron");
    });

    it("extracts trailing (conj)", () => {
      const result = parseWord("and (conj)");
      expect(result.word).toBe("and");
      expect(result.partOfSpeech).toBe("conj");
    });

    it("extracts trailing (det)", () => {
      const result = parseWord("the (det)");
      expect(result.word).toBe("the");
      expect(result.partOfSpeech).toBe("det");
    });

    it("extracts trailing (phr v)", () => {
      const result = parseWord("look after  (phr v)");
      expect(result.word).toBe("look after");
      expect(result.partOfSpeech).toBe("phr v");
    });

    it("extracts trailing (phr)", () => {
      const result = parseWord("by the way (phr)");
      expect(result.word).toBe("by the way");
      expect(result.partOfSpeech).toBe("phr");
    });

    it("extracts trailing (exp)", () => {
      const result = parseWord("how are you (exp)");
      expect(result.word).toBe("how are you");
      expect(result.partOfSpeech).toBe("exp");
    });

    it("extracts trailing (idiom)", () => {
      const result = parseWord("break a leg (idiom)");
      expect(result.word).toBe("break a leg");
      expect(result.partOfSpeech).toBe("idiom");
    });

    it("returns null POS for no parenthesized marker", () => {
      const result = parseWord("hello");
      expect(result.word).toBe("hello");
      expect(result.partOfSpeech).toBeNull();
    });

    it("preserves word casing", () => {
      const result = parseWord("Hello (n)");
      expect(result.word).toBe("Hello");
    });

    it("does not extract non-POS parenthesized text", () => {
      const result = parseWord("hello (world)");
      expect(result.word).toBe("hello (world)");
      expect(result.partOfSpeech).toBeNull();
    });

    it("handles POS case-insensitively", () => {
      const result = parseWord("test (N)");
      expect(result.word).toBe("test");
      expect(result.partOfSpeech).toBe("n");
    });

    it("trims input whitespace", () => {
      const result = parseWord("  hello  ");
      expect(result.word).toBe("hello");
    });

    it("returns canonical lowercase POS", () => {
      const result = parseWord("test (ADJ)");
      expect(result.partOfSpeech).toBe("adj");
    });

    it("extracts dotted Word variants like (v.) and (n.)", () => {
      expect(parseWord("play (v.)")).toEqual({ word: "play", partOfSpeech: "v" });
      expect(parseWord("book (n.)")).toEqual({ word: "book", partOfSpeech: "n" });
      expect(parseWord("quick (adj.)")).toEqual({ word: "quick", partOfSpeech: "adj" });
    });

    it("extracts slash combinations like (v/n) and (n/adj)", () => {
      expect(parseWord("beep(v/n)")).toEqual({ word: "beep", partOfSpeech: "v/n" });
      expect(parseWord("patient (n/adj)")).toEqual({ word: "patient", partOfSpeech: "n/adj" });
    });

    it("extracts phrasal variants like (phr. v)", () => {
      expect(parseWord("kick off(phr. v)")).toEqual({ word: "kick off", partOfSpeech: "phr v" });
    });

    it("extracts extended tags like (vt), (vi) and (interj)", () => {
      expect(parseWord("raise (vt)")).toEqual({ word: "raise", partOfSpeech: "vt" });
      expect(parseWord("rise (vi)")).toEqual({ word: "rise", partOfSpeech: "vi" });
      expect(parseWord("wow (interj)")).toEqual({ word: "wow", partOfSpeech: "interj" });
    });

    it("strips newlines inside the annotation", () => {
      expect(parseWord("play (v\n)")).toEqual({ word: "play", partOfSpeech: "v" });
    });

    it("does not extract gloss parentheticals", () => {
      expect(parseWord("give a reason why (for)").partOfSpeech).toBeNull();
      expect(parseWord("focus (concentrate) on").partOfSpeech).toBeNull();
      expect(parseWord("perform (do) CPR").partOfSpeech).toBeNull();
    });
  });
});
