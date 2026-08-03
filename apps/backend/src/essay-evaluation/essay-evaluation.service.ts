import { Injectable, Logger } from "@nestjs/common";
import { ConfigurationService } from "../config/configuration.service";
import type { GrammarEvaluationResult, GrammarError, AiEvaluationResult, AiCriterionScore } from "./types";

// ── Common English misspellings (simplified dictionary) ──────────────────
const COMMON_MISSPELLINGS: Record<string, string> = {
  "acheive": "achieve", "agressive": "aggressive", "apparant": "apparent",
  "arguement": "argument", "beleive": "believe", "calender": "calendar",
  "catagory": "category", "cemetary": "cemetery", "collectable": "collectible",
  "commitee": "committee", "concious": "conscious", "curiousity": "curiosity",
  "definately": "definitely", "desparate": "desperate", "disappear": "disappear",
  "embarass": "embarrass", "enviroment": "environment", "exagerate": "exaggerate",
  "experiance": "experience", "extremly": "extremely", "febuary": "february",
  "finaly": "finally", "foriegn": "foreign", "fourty": "forty",
  "foward": "forward", "freind": "friend", "fundemental": "fundamental",
  "goverment": "government", "grammer": "grammar", "happend": "happened",
  "harrass": "harass", "honour": "honor", "humour": "humor",
  "immediatly": "immediately", "independant": "independent", "interum": "interim",
  "knowlege": "knowledge", "libary": "library", "lisence": "license",
  "maintainance": "maintenance", "millenium": "millennium", "mischievious": "mischievous",
  "mispell": "misspell", "neccessary": "necessary", "nineth": "ninth",
  "ninty": "ninety", "occassion": "occasion", "occured": "occurred",
  "occuring": "occurring", "opthamologist": "ophthalmologist", "paralel": "parallel",
  "parliment": "parliament", "persistant": "persistent", "pharoah": "pharaoh",
  "phenomenon": "phenomenon", "posession": "possession", "priviledge": "privilege",
  "proffesional": "professional", "promiseing": "promising", "pronounciation": "pronunciation",
  "publicaly": "publicly", "recieve": "receive", "refered": "referred",
  "refering": "referring", "remeber": "remember", "resistence": "resistance",
  "seperate": "separate", "sergent": "sergeant", "sincereley": "sincerely",
  "speach": "speech", "succesful": "successful", "suprize": "surprise",
  "tommorow": "tomorrow", "tounge": "tongue", "truely": "truly",
  "unfortunatly": "unfortunately", "untill": "until", "wierd": "weird",
  "writting": "writing",   "adress": "address", "alot": "a lot", "athiest": "atheist",
  "begining": "beginning", "buro": "bureau", "buisness": "business",
  "comitee": "committee", "concensus": "consensus", "daugher": "daughter",
  "decieve": "deceive", "dependant": "dependent", "dissapear": "disappear",
  "dissapoint": "disappoint", "eigth": "eighth", "especialy": "especially",
  "exellent": "excellent", "familar": "familiar", "garauntee": "guarantee",
  "guidence": "guidance", "hier": "heir", "humourous": "humorous",
  "imaginery": "imaginary", "intelegent": "intelligent", "jeapardy": "jeopardy",
  "judgement": "judgment", "leutenant": "lieutenant", "lightening": "lightning",
  "loose": "lose", "medecine": "medicine", "miniscule": "minuscule",
  "misson": "mission", "morgage": "mortgage", "noticable": "noticeable",
  "ocassion": "occasion", "ocur": "occur", "paralell": "parallel",
  "pasttime": "pastime", "peices": "pieces", "persue": "pursue",
  "potatos": "potatoes", "presense": "presence", "professor": "professor",
  "programer": "programmer", "pubicaly": "publicly", "reced": "recede",
  "repetion": "repetition", "restraunt": "restaurant", "rythm": "rhythm",
  "sargent": "sergeant", "seige": "siege", "similer": "similar",
  "sophmore": "sophomore", "sponser": "sponsor", "stoped": "stopped",
  "succede": "succeed", "surely": "surely", "surley": "surly",
  "teh": "the", "thier": "their", "through": "through",
  "tommorrow": "tomorrow", "twelth": "twelfth", "usally": "usually",
  "vaccume": "vacuum", "vegitable": "vegetable", "villian": "villain",
  "writen": "written", "yatch": "yacht",
};

const COMMON_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "can", "shall", "must", "to", "of", "in", "for", "on",
  "with", "at", "by", "from", "as", "into", "through", "during", "before", "after",
  "above", "below", "between", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just", "because",
  "and", "but", "or", "if", "while", "although", "since", "unless", "until",
  "about", "against", "among", "around", "before", "behind", "beside", "between",
  "beyond", "inside", "outside", "underneath", "upon", "within", "without",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
  "us", "them", "my", "your", "his", "its", "our", "their", "mine", "yours",
  "hers", "ours", "theirs", "this", "that", "these", "those",
  "am", "been", "being", "having", "doing", "going", "saying", "getting",
  "make", "made", "know", "known", "take", "took", "taken", "see", "saw", "seen",
  "come", "came", "give", "gave", "given", "find", "found", "think", "thought",
  "tell", "told", "become", "became", "leave", "left", "feel", "felt",
  "put", "bring", "brought", "begin", "began", "begun", "keep", "kept",
  "hold", "held", "write", "wrote", "written", "stand", "stood",
  "hear", "heard", "let", "mean", "meant", "set", "meet", "met",
  "run", "ran", "pay", "paid", "sit", "sat", "speak", "spoke", "spoken",
  "lie", "lay", "lead", "led", "read", "grow", "grew", "grown",
  "lose", "lost", "fall", "fell", "fallen", "send", "sent",
  "build", "built", "understand", "understood", "draw", "drew", "drawn",
  "break", "broke", "broken", "spend", "spent", "cut", "drive", "drove", "driven",
  "buy", "bought", "wear", "wore", "worn", "choose", "chose", "chosen",
  "seek", "sought", "throw", "threw", "thrown", "catch", "caught",
  "people", "time", "year", "day", "way", "man", "men", "woman", "women",
  "child", "children", "world", "life", "hand", "part", "place", "case",
  "week", "company", "system", "program", "question", "work", "government",
  "number", "night", "point", "home", "water", "room", "mother", "father",
  "family", "student", "country", "city", "state", "group", "school",
  "friend", "food", "book", "word", "idea", "end", "house", "example",
  "member", "service", "price", "road", "street", "office", "team",
  "minute", "hour", "month", "class", "teacher", "lesson", "course",
  "english", "arabic", "language", "learning", "study", "learn",
  "good", "new", "first", "last", "long", "great", "little", "right",
  "high", "different", "small", "large", "next", "early", "young",
  "important", "few", "public", "bad", "same", "old", "big",
  "able", "best", "better", "real", "sure", "free", "full",
  "special", "easy", "clear", "strong", "beautiful", "happy",
  "hard", "open", "close", "ready", "simple", "nice", "true",
  "well", "also", "back", "much", "ever", "still", "always",
  "never", "often", "sometimes", "together", "maybe", "away",
  "today", "already", "however", "though", "almost", "enough",
  "even", "rather", "quite", "really", "finally",
  "up", "down", "now", "now", "then", "here", "there",
]);

@Injectable()
export class EssayEvaluationService {
  private readonly logger = new Logger(EssayEvaluationService.name);

  constructor(private readonly config: ConfigurationService) {}

  evaluateGrammar(text: string): GrammarEvaluationResult {
    const errors: GrammarError[] = [];
    const trimmed = text.trim();
    if (!trimmed) {
      return { score: 0, errors: [], summary: "No text provided." };
    }

    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
    const words = trimmed.split(/\s+/).filter(Boolean);

    // 1. Capitalization: first word of each sentence
    for (let si = 0; si < sentences.length; si++) {
      const sentence = sentences[si].trim();
      if (!sentence) continue;
      const firstWord = sentence.match(/[A-Za-z\u00C0-\u024F]+/);
      if (firstWord && firstWord[0] && firstWord[0] !== firstWord[0].toUpperCase()) {
        const pos = trimmed.indexOf(sentence);
        if (pos >= 0) {
          errors.push({
            type: "capitalization",
            message: `Sentence should start with a capital letter`,
            word: firstWord[0],
            position: pos,
            suggestion: firstWord[0].charAt(0).toUpperCase() + firstWord[0].slice(1),
          });
        }
      }
    }

    // 2. Punctuation: each sentence should end with . ? or !
    for (let si = 0; si < sentences.length; si++) {
      const sentence = sentences[si].trim();
      if (!sentence) continue;
      const lastChar = sentence.charAt(sentence.length - 1);
      if (![".", "!", "?"].includes(lastChar)) {
        const pos = trimmed.indexOf(sentence);
        if (pos >= 0) {
          errors.push({
            type: "punctuation",
            message: `Sentence should end with proper punctuation`,
            word: sentence.slice(-10),
            position: pos + Math.max(0, sentence.length - 10),
            suggestion: sentence + ".",
          });
        }
      }
    }

    // 3. Spelling check
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi].replace(/[^A-Za-z\u00C0-\u024F'-]/g, "").toLowerCase();
      if (!w || w.length <= 1) continue;
      if (COMMON_MISSPELLINGS[w]) {
        const pos = trimmed.toLowerCase().indexOf(w);
        if (pos >= 0) {
          errors.push({
            type: "spelling",
            message: `"${words[wi]}" may be misspelled`,
            word: words[wi],
            position: pos,
            suggestion: COMMON_MISSPELLINGS[w],
          });
        }
      } else if (COMMON_WORDS.has(w)) {
        // known correct
      }
      // If word is not in dictionary and not a misspelling, we skip (would need full dictionary)
    }

    // 4. Subject-verb agreement (basic)
    const svaPatterns = [
      { pattern: /\b(they|we|i|you)\s+goes\b/gi, replacement: "go" },
      { pattern: /\b(he|she|it)\s+go\b/gi, replacement: "goes" },
      { pattern: /\b(they|we|i|you)\s+does\b/gi, replacement: "do" },
      { pattern: /\b(he|she|it)\s+don't\b/gi, replacement: "doesn't" },
      { pattern: /\b(they|we|you)\s+doesn't\b/gi, replacement: "don't" },
      { pattern: /\b(he|she|it)\s+were\b/gi, replacement: "was" },
      { pattern: /\b(they|we|you)\s+was\b/gi, replacement: "were" },
      { pattern: /\b(he|she|it)\s+have\b/gi, replacement: "has" },
      { pattern: /\b(they|we|i|you)\s+has\b/gi, replacement: "have" },
    ];

    for (const { pattern, replacement } of svaPatterns) {
      const match = trimmed.match(pattern);
      if (match && match.index !== undefined) {
        errors.push({
          type: "subject_verb_agreement",
          message: `Subject-verb agreement error: "${match[0]}" should use "${match[1]} ${replacement}"`,
          word: match[0],
          position: match.index,
          suggestion: match[0].replace(pattern, `$1 ${replacement}`),
        });
      }
    }

    // 5. Article usage: "a" vs "an"
    const articlePattern = /\b(a)\s+([aeiouAEIOU][a-z]*)\b/g;
    let articleMatch: RegExpExecArray | null;
    while ((articleMatch = articlePattern.exec(trimmed)) !== null) {
      errors.push({
        type: "article",
        message: `"a" should be "an" before "${articleMatch[2]}"`,
        word: `a ${articleMatch[2]}`,
        position: articleMatch.index,
        suggestion: `an ${articleMatch[2]}`,
      });
    }

    // 6. Word repetition
    for (let wi = 1; wi < words.length; wi++) {
      const w1 = words[wi - 1].replace(/[^A-Za-z]/g, "").toLowerCase();
      const w2 = words[wi].replace(/[^A-Za-z]/g, "").toLowerCase();
      if (w1 === w2 && w1.length > 2) {
        const pos = trimmed.toLowerCase().indexOf(words[wi].toLowerCase(), trimmed.toLowerCase().indexOf(words[wi - 1].toLowerCase()) + words[wi - 1].length);
        if (pos >= 0) {
          errors.push({
            type: "repetition",
            message: `"${words[wi]}" is repeated consecutively`,
            word: words[wi],
            position: pos,
            suggestion: words[wi],
          });
          break;
        }
      }
    }

    // Calculate score: start at 100, deduct for each error
    const totalIssues = errors.length;
    const maxDeductions = Math.min(totalIssues, 20); // cap deductions at 20 errors
    const rawScore = Math.max(0, 100 - maxDeductions * 8);
    const score = Math.round(rawScore / 10) * 10; // round to nearest 10

    const errorCounts: Record<string, number> = {};
    for (const e of errors) {
      errorCounts[e.type] = (errorCounts[e.type] ?? 0) + 1;
    }
    const summary = this.buildGrammarSummary(score, errorCounts, totalIssues);

    return { score, errors, summary };
  }

  async evaluateAI(prompt: string, answer: string): Promise<AiEvaluationResult> {
    const { apiKey, model, endpoint } = this.config.ai;

    const gradingPrompt = `You are an expert English essay evaluator. Grade the following student essay based on these criteria:

1. **Content & Ideas (25%)** — Does the essay address the prompt? Are ideas clear and well-developed?
2. **Organization & Structure (20%)** — Is there a clear introduction, body, and conclusion? Are ideas logically ordered?
3. **Grammar & Accuracy (25%)** — Are sentences grammatically correct? Proper tense usage, subject-verb agreement, etc.
4. **Vocabulary & Word Choice (15%)** — Is the vocabulary appropriate and varied? Are words used correctly?
5. **Spelling & Mechanics (15%)** — Are words spelled correctly? Proper punctuation and capitalization?

For each criterion, provide a score from 0-100 and brief feedback.

ESSAY PROMPT: "${prompt}"

STUDENT ANSWER: "${answer}"

Respond in the following JSON format (ONLY valid JSON, no other text):
{
  "criterionScores": [
    { "name": "Content & Ideas", "score": 0-100, "feedback": "..." },
    { "name": "Organization & Structure", "score": 0-100, "feedback": "..." },
    { "name": "Grammar & Accuracy", "score": 0-100, "feedback": "..." },
    { "name": "Vocabulary & Word Choice", "score": 0-100, "feedback": "..." },
    { "name": "Spelling & Mechanics", "score": 0-100, "feedback": "..." }
  ],
  "overallScore": 0-100,
  "feedback": "Overall feedback summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"]
}`;

    if (!apiKey) {
      return this.fallbackAiEvaluation(prompt, answer);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => { controller.abort(); }, 30000);

      const response = await fetch(endpoint, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are an expert English essay grading assistant. Always respond with valid JSON only." },
            { role: "user", content: gradingPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as { choices: { message: { content: string } }[] };
        const content = data.choices[0]?.message.content ?? "";
        const parsed = this.parseAiResponse(content);
        return parsed;
      }
    } catch {
      this.logger.warn("AI evaluation call failed, falling back to rule-based evaluation");
    }

    return this.fallbackAiEvaluation(prompt, answer);
  }

  private parseAiResponse(content: string): AiEvaluationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          criterionScores?: AiCriterionScore[];
          overallScore?: number;
          feedback?: string;
          strengths?: string[];
          weaknesses?: string[];
        };
        return {
          score: parsed.overallScore ?? Math.round(
            (parsed.criterionScores ?? []).reduce((s, c) => s + c.score, 0) / Math.max((parsed.criterionScores ?? []).length, 1)
          ),
          feedback: parsed.feedback ?? "Evaluation completed.",
          strengths: parsed.strengths ?? [],
          weaknesses: parsed.weaknesses ?? [],
          criterionScores: parsed.criterionScores ?? [],
        };
      }
    } catch {
      this.logger.warn("Failed to parse AI evaluation response");
    }
    return this.fallbackAiEvaluation("", content);
  }

  private fallbackAiEvaluation(_prompt: string, answer: string): AiEvaluationResult {
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const sentenceCount = (answer.match(/[.!?]+/g) ?? []).length;

    const feedback: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Basic fallback scoring
    let score = 60;

    if (wordCount >= 50) {
      score += 10;
      strengths.push("Good length and effort in writing");
    } else if (wordCount < 20) {
      score -= 10;
      weaknesses.push("Essay is too short; expand your ideas");
    } else {
      strengths.push("Adequate length for the response");
    }

    if (sentenceCount >= 3) {
      score += 5;
      strengths.push("Uses multiple sentences");
    } else {
      weaknesses.push("Try using more varied sentence structures");
    }

    if (wordCount > 0) {
      const avgWordLength = answer.replace(/\s/g, "").length / wordCount;
      if (avgWordLength > 4) {
        score += 5;
        strengths.push("Uses a range of vocabulary");
      }
    }

    score = Math.max(0, Math.min(100, score));

    if (score >= 70) feedback.push("Good effort on this essay.");
    else feedback.push("There is room for improvement. Try to develop your ideas more fully.");

    return {
      score,
      feedback: feedback.join(" "),
      strengths,
      weaknesses,
      criterionScores: [
        { name: "Content & Ideas", score, feedback: "Based on length and structure analysis" },
        { name: "Organization & Structure", score: Math.min(100, score + 5), feedback: "Basic structure detected" },
        { name: "Grammar & Accuracy", score, feedback: "See grammar check for details" },
        { name: "Vocabulary & Word Choice", score, feedback: "Vocabulary analysis based on text statistics" },
        { name: "Spelling & Mechanics", score, feedback: "See spelling check for details" },
      ],
    };
  }

  private buildGrammarSummary(score: number, errorCounts: Record<string, number>, totalIssues: number): string {
    if (totalIssues === 0) return "No grammar or spelling issues found. Excellent writing!";
    const parts: string[] = [`Score: ${score}/100`];
    if (errorCounts.spelling) parts.push(`${errorCounts.spelling} spelling error(s)`);
    if (errorCounts.capitalization) parts.push(`${errorCounts.capitalization} capitalization issue(s)`);
    if (errorCounts.punctuation) parts.push(`${errorCounts.punctuation} punctuation issue(s)`);
    if (errorCounts.subject_verb_agreement) parts.push(`${errorCounts.subject_verb_agreement} subject-verb agreement error(s)`);
    if (errorCounts.article) parts.push(`${errorCounts.article} article usage error(s)`);
    if (errorCounts.repetition) parts.push(`${errorCounts.repetition} repetition(s)`);
    return parts.join("; ") + ".";
  }
}
