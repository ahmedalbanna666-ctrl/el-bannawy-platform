import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
} from "docx";

function cell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text })],
        alignment: AlignmentType.LEFT,
      }),
    ],
  });
}

function row(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells });
}

export async function createSimpleVocabTable(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row([cell("Word"), cell("Meaning")]),
              row([cell("learn"), cell("يتعلم")]),
              row([cell("study"), cell("يذاكر")]),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function createFourColumnTable(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row([cell("Word"), cell("Meaning"), cell("Word"), cell("Meaning")]),
              row([cell("learn"), cell("يتعلم"), cell("study"), cell("يذاكر")]),
              row([cell("write"), cell("يكتب"), cell("read"), cell("يقرأ")]),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function createMixedDocument(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Vocabulary Lesson" })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row([cell("Word"), cell("Meaning")]),
              row([cell("learn"), cell("يتعلم")]),
              row([cell("study"), cell("يذاكر")]),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "End of Vocabulary" })],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function createEdgeCaseTable(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row([cell("Word"), cell("Meaning")]),
              row([cell(""), cell("empty word cell")]),
              row([cell("hello"), cell("")]),
              row([cell(""), cell("")]),
              row([
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "first part " }),
                        new TextRun({ text: "second part", bold: true }),
                      ],
                    }),
                  ],
                }),
                cell("multiple runs"),
              ]),
              row([
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "line1", break: 1 }),
                        new TextRun({ text: "line2" }),
                      ],
                    }),
                  ],
                }),
                cell("line break"),
              ]),
              row([cell("English"), cell("عربي English مختلط")]),
              row([cell("punctuation"), cell("...!!؟؟\"'")]),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function createEmptyBufferDocx(): Promise<Buffer> {
  return Buffer.alloc(0);
}

export function createNonZipBuffer(): Buffer {
  return Buffer.from("this is not a zip file or docx content at all");
}
