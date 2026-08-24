const COT_PATTERNS: RegExp[] = [
  /here'?s (?:my |a )?thinking process/i,
  /thinking process:/i,
  /analyze user input/i,
  /let me think (?:this |it )?through/i,
  /step[- ]by[- ]step thinking/i,
];

export function isCoTDump(content: string): boolean {
  if (!content || content.length === 0) return false;
  const head = content.slice(0, 600);
  return COT_PATTERNS.some((pattern) => pattern.test(head));
}
