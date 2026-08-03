export interface NormalizedCell {
  readonly columnIndex: number;
  readonly text: string;
  readonly html?: string;
  readonly colspan?: number;
  readonly rowspan?: number;
}

export interface NormalizedRow {
  readonly rowIndex: number;
  readonly cells: readonly NormalizedCell[];
}

export interface NormalizedTable {
  readonly tableIndex: number;
  readonly rows: readonly NormalizedRow[];
}

export interface NormalizedParagraph {
  readonly paragraphIndex: number;
  readonly text: string;
  readonly html?: string;
  readonly headingLevel?: number;
}

export type ContentEntry =
  | { readonly kind: "paragraph"; readonly index: number }
  | { readonly kind: "table"; readonly index: number };

export interface NormalizedDocument {
  readonly tables: readonly NormalizedTable[];
  readonly paragraphs: readonly NormalizedParagraph[];
  readonly contentOrder?: readonly ContentEntry[];
  readonly metadata: NormalizedDocumentMetadata;
}

export interface NormalizedDocumentMetadata {
  readonly totalTables: number;
  readonly totalParagraphs: number;
  readonly totalRows: number;
  readonly mammothWarnings?: readonly string[];
}
