import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Block } from "./content";
import { STATUS_LABEL } from "./content";

const STATUS_COLOR = { good: "0AAC23", warning: "B7791F", critical: "DC3C3D", unknown: "94A3B8" } as const;
const border = { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const CONTENT_WIDTH = 9360; // US Letter with 1" margins, in DXA

function table(head: string[], rows: string[][], align?: ("left" | "right")[]) {
  const first = Math.round(CONTENT_WIDTH * 0.34);
  const rest = Math.floor((CONTENT_WIDTH - first) / Math.max(1, head.length - 1));
  const widths = head.map((_, i) => (i === 0 ? first : rest));
  const cell = (text: string, i: number, header: boolean) =>
    new TableCell({
      borders: cellBorders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: header ? { fill: "F1F5F9", type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: align?.[i] === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text, bold: header, size: 18 })],
        }),
      ],
    });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

/** Render document blocks to a .docx buffer. */
export async function renderDocx(doc: { title: string; subtitle: string; blocks: Block[] }): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: doc.title })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: doc.subtitle, color: "64748B" })] }),
  ];
  let numberedLists = 0;

  for (const b of doc.blocks) {
    switch (b.type) {
      case "h1":
      case "h2":
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(b.text)] }));
        break;
      case "h3":
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(b.text)] }));
        break;
      case "p":
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: b.text, color: b.muted ? "64748B" : undefined, italics: b.muted })],
          }),
        );
        break;
      case "bullets": {
        const instance = b.numbered ? ++numberedLists : 0;
        for (const item of b.items)
          children.push(
            new Paragraph({
              numbering: b.numbered ? { reference: "numbers", level: 0, instance } : { reference: "bullets", level: 0 },
              spacing: { after: 60 },
              children: [new TextRun(item)],
            }),
          );
        break;
      }
      case "kv":
        children.push(table(["Metric", "Value"], b.rows, ["left", "right"]));
        children.push(new Paragraph({ children: [] }));
        break;
      case "table":
        children.push(table(b.head, b.rows, b.align));
        children.push(new Paragraph({ children: [] }));
        break;
      case "scores":
        for (const s of b.scores)
          children.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: `${s.label}: `, bold: true }),
                new TextRun({ text: `${s.score ?? "—"}/100 · ${STATUS_LABEL[s.status]}`, bold: true, color: STATUS_COLOR[s.status] }),
                new TextRun({ text: ` — ${b.notes[s.key] || s.basis}`, color: "475569" }),
              ],
            }),
          );
        break;
    }
  }

  const document = new Document({
    creator: "Meta Ads AI Analyzer",
    title: doc.title,
    styles: {
      default: { document: { run: { font: "Arial", size: 21 } } },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          run: { size: 44, bold: true, color: "111827", font: "Arial" },
          paragraph: { spacing: { after: 80 } },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, color: "111827", font: "Arial" },
          paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: "2563EB", font: "Arial" },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(document);
}
