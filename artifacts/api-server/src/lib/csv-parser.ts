import { parse } from "csv-parse/sync";
import type { ParsedFile } from "./session-store";

export function parseCSV(buffer: Buffer, filename: string): ParsedFile {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error("CSV file is empty or has no data rows");
  }

  const columns = Object.keys(records[0]);

  return {
    filename,
    rows: records,
    columns,
  };
}

export function previewRows(rows: Record<string, string>[], limit = 5): Record<string, string>[] {
  return rows.slice(0, limit);
}
