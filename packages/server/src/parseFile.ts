import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { analyzeTable, ReportParseError, type ReportData } from "@maa/core";
import { HttpError } from "./errors";

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const;

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

/** Detect the delimiter from the first line: Meta exports use commas, some locales use ; or tabs. */
function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function decodeText(buffer: Buffer): string {
  // UTF-16 LE with BOM (Excel "Unicode text")
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString("utf16le").slice(1);
  const text = buffer.toString("utf8");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function csvToTable(buffer: Buffer): unknown[][] {
  const text = decodeText(buffer);
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  return parseCsv(text, {
    delimiter: detectDelimiter(firstLine),
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    bom: true,
  }) as unknown[][];
}

async function xlsxToTable(buffer: Buffer): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs typings expect an ArrayBuffer-like Buffer
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  // Use the sheet with the most rows (Meta puts data on the first sheet; some exports add a notes sheet).
  const sheet = [...workbook.worksheets].sort((a, b) => b.actualRowCount - a.actualRowCount)[0];
  if (!sheet) throw new HttpError(422, "The workbook has no sheets.", "empty_file");
  const table: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed; drop the empty slot
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    table.push(values.map((v) => (v === undefined ? "" : v)));
  });
  return table;
}

export async function parseReportFile(buffer: Buffer, fileName: string): Promise<ReportData> {
  const ext = extensionOf(fileName);
  if (ext === ".xls") {
    throw new HttpError(415, "Legacy .xls files aren't supported. In Ads Manager choose Export → .xlsx or .csv.", "unsupported_type");
  }
  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new HttpError(415, "Please upload a .csv or .xlsx file exported from Meta Ads Manager.", "unsupported_type");
  }

  let table: unknown[][];
  try {
    table = ext === ".csv" ? csvToTable(buffer) : await xlsxToTable(buffer);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, "We couldn't read this file. Make sure it's a valid CSV or Excel export.", "unreadable_file");
  }

  try {
    return analyzeTable(table, fileName);
  } catch (err) {
    if (err instanceof ReportParseError) throw new HttpError(422, err.message, "not_meta_report");
    throw err;
  }
}
