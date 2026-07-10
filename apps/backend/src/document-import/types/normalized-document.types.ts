export interface NormalizedCell {
  readonly columnIndex: number;
  readonly text: string;
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
}

export interface NormalizedDocument {
  readonly tables: readonly NormalizedTable[];
  readonly paragraphs: readonly NormalizedParagraph[];
  readonly metadata: NormalizedDocumentMetadata;
}

export interface NormalizedDocumentMetadata {
  readonly totalTables: number;
  readonly totalParagraphs: number;
  readonly totalRows: number;
}
