import PDFDocument from "pdfkit";
import type { Block } from "./content";
import { STATUS_LABEL } from "./content";

const BRAND = "#2563EB";
const INK = "#111827";
const MUTED = "#64748B";
const STATUS_COLOR = { good: "#0aac23", warning: "#d28e05", critical: "#dc3c3d", unknown: "#94a3b8" } as const;

/** Render document blocks to a PDF buffer (A4, built-in Helvetica). */
export function renderPdf(doc: { title: string; subtitle: string; blocks: Block[] }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: { Title: doc.title, Producer: "Meta Ads AI Analyzer" },
    });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const width = pdf.page.width - 100;
    const ensure = (h: number) => {
      if (pdf.y + h > pdf.page.height - 60) pdf.addPage();
    };
    // Built-in fonts are WinAnsi; replace characters they can't draw.
    const clean = (s: string) =>
      s
        .replace(/≈/g, "~")
        .replace(/×/g, "x")
        .replace(/÷/g, "/")
        .replace(/[→]/g, "->")
        .replace(/[—–]/g, "-")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[^\x00-\xFF€]/g, "");

    // Cover header
    pdf.rect(0, 0, pdf.page.width, 110).fill(BRAND);
    pdf.fillColor("#fff").font("Helvetica-Bold").fontSize(22).text(doc.title, 50, 38, { width });
    pdf.font("Helvetica").fontSize(10).fillColor("#DBEAFE").text(clean(doc.subtitle), 50, 70, { width });
    pdf.y = 140;

    for (const b of doc.blocks) {
      switch (b.type) {
        case "h1":
        case "h2":
          ensure(60);
          pdf.moveDown(0.8).font("Helvetica-Bold").fontSize(15).fillColor(INK).text(clean(b.text), 50, pdf.y, { width });
          pdf
            .moveTo(50, pdf.y + 3)
            .lineTo(50 + width, pdf.y + 3)
            .lineWidth(1)
            .strokeColor("#E2E8F0")
            .stroke();
          pdf.moveDown(0.6);
          break;
        case "h3":
          ensure(40);
          pdf.moveDown(0.4).font("Helvetica-Bold").fontSize(11).fillColor(BRAND).text(clean(b.text), 50, pdf.y, { width }).moveDown(0.2);
          break;
        case "p":
          ensure(30);
          pdf
            .font("Helvetica")
            .fontSize(10)
            .fillColor(b.muted ? MUTED : INK)
            .text(clean(b.text), 50, pdf.y, { width, lineGap: 2 })
            .moveDown(0.4);
          break;
        case "bullets":
          b.items.forEach((item, i) => {
            ensure(24);
            const y = pdf.y;
            pdf
              .font("Helvetica-Bold")
              .fontSize(10)
              .fillColor(BRAND)
              .text(b.numbered ? `${i + 1}.` : "•", 54, y, { width: 16 });
            pdf
              .font("Helvetica")
              .fillColor(INK)
              .text(clean(item), 72, y, { width: width - 22, lineGap: 2 });
            pdf.moveDown(0.25);
          });
          pdf.moveDown(0.2);
          break;
        case "kv": {
          const colW = width / 2;
          for (let i = 0; i < b.rows.length; i += 2) {
            ensure(22);
            const y = pdf.y;
            [b.rows[i], b.rows[i + 1]].forEach((row, j) => {
              if (!row) return;
              const x = 50 + j * colW;
              pdf
                .font("Helvetica")
                .fontSize(9)
                .fillColor(MUTED)
                .text(row[0], x, y, { width: colW * 0.55 });
              pdf
                .font("Helvetica-Bold")
                .fontSize(10)
                .fillColor(INK)
                .text(clean(row[1]), x + colW * 0.55, y, { width: colW * 0.4, align: "right" });
            });
            pdf.y = y + 18;
          }
          break;
        }
        case "scores":
          for (const s of b.scores) {
            ensure(34);
            const y = pdf.y;
            const color = STATUS_COLOR[s.status];
            pdf.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(s.label, 50, y, { width: 130 });
            pdf.roundedRect(185, y + 2, 200, 7, 3.5).fill("#E2E8F0");
            if (s.score) pdf.roundedRect(185, y + 2, 2 * s.score, 7, 3.5).fill(color);
            pdf
              .font("Helvetica-Bold")
              .fontSize(10)
              .fillColor(color)
              .text(`${s.score ?? "—"} · ${STATUS_LABEL[s.status]}`, 395, y, { width: width - 345, align: "right" });
            pdf
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor(MUTED)
              .text(clean(b.notes[s.key] || s.basis), 50, y + 14, { width, lineGap: 1 });
            pdf.moveDown(0.6);
          }
          break;
        case "table": {
          const n = b.head.length;
          const first = Math.min(width * 0.36, width - (n - 1) * 52);
          const rest = (width - first) / (n - 1);
          const widths = b.head.map((_, i) => (i === 0 ? first : rest));
          const drawRow = (cells: string[], header: boolean) => {
            const heights = cells.map((c, i) =>
              pdf
                .font(header ? "Helvetica-Bold" : "Helvetica")
                .fontSize(8.5)
                .heightOfString(clean(c), { width: widths[i] - 8 }),
            );
            const h = Math.max(...heights) + 8;
            ensure(h);
            const y = pdf.y;
            if (header) pdf.rect(50, y, width, h).fill("#F1F5F9");
            let x = 50;
            cells.forEach((c, i) => {
              pdf
                .font(header ? "Helvetica-Bold" : "Helvetica")
                .fontSize(8.5)
                .fillColor(header ? MUTED : INK)
                .text(clean(c), x + 4, y + 4, { width: widths[i] - 8, align: b.align?.[i] ?? "left" });
              x += widths[i];
            });
            pdf
              .moveTo(50, y + h)
              .lineTo(50 + width, y + h)
              .lineWidth(0.5)
              .strokeColor("#E2E8F0")
              .stroke();
            pdf.y = y + h;
          };
          drawRow(b.head, true);
          b.rows.forEach((r) => drawRow(r, false));
          pdf.moveDown(0.6);
          break;
        }
      }
    }

    // Footer with page numbers
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      // Writing inside the bottom margin would otherwise trigger an automatic page break.
      pdf.page.margins.bottom = 0;
      pdf
        .font("Helvetica")
        .fontSize(8)
        .fillColor(MUTED)
        .text(`Meta Ads AI Analyzer · Page ${i + 1} of ${range.count}`, 50, pdf.page.height - 35, {
          width,
          align: "center",
          lineBreak: false,
        });
    }
    pdf.end();
  });
}
