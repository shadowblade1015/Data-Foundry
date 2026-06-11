import type { ParsedFile, MatchRow } from "./session-store";

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToLine(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

function resolvedValue(match: MatchRow): string {
  if (match.status === "corrected") return match.correctedValue ?? "";
  if (match.status === "approved") return match.suggestedValue ?? "";
  if (match.matchType === "exact" || match.matchType === "normalized") return match.suggestedValue ?? "";
  if (match.status === "ignored") return match.originalValue ?? "";
  return match.suggestedValue ?? "";
}

export function buildCleanedCsv(
  rawFile: ParsedFile,
  matches: MatchRow[],
  outputColumnName: string
): string {
  const headers = [
    ...rawFile.columns,
    outputColumnName,
    "Match Confidence",
    "Match Type",
    "Curing Status",
  ];

  const lines: string[] = [rowToLine(headers)];

  for (let i = 0; i < rawFile.rows.length; i++) {
    const row = rawFile.rows[i];
    const match = matches[i];

    const values = [
      ...rawFile.columns.map((col) => row[col] ?? ""),
      match ? resolvedValue(match) : "",
      match ? String(match.confidenceScore) : "0",
      match ? match.matchType : "none",
      match ? match.status : "pending",
    ];
    lines.push(rowToLine(values));
  }

  return lines.join("\n") + "\n";
}

export function buildExceptionsCsv(
  rawFile: ParsedFile,
  matches: MatchRow[]
): string {
  const headers = [
    ...rawFile.columns,
    "Match Confidence",
    "Match Type",
    "Curing Status",
    "Exception Reason",
  ];

  const lines: string[] = [rowToLine(headers)];

  for (let i = 0; i < rawFile.rows.length; i++) {
    const row = rawFile.rows[i];
    const match = matches[i];
    if (!match) continue;

    const isBlank = !match.originalValue || match.originalValue.trim() === "";

    if (match.status === "corrected") continue;

    const isException =
      isBlank ||
      match.status === "ignored" ||
      match.matchType === "none" ||
      match.confidenceScore < 75;

    if (!isException) continue;

    let reason = "";
    if (isBlank) {
      reason = "Blank value";
    } else if (match.status === "ignored") {
      reason = "Ignored by user";
    } else if (match.matchType === "none" && match.confidenceScore === 0) {
      reason = "No match found";
    } else if (match.matchType === "none" || match.confidenceScore < 75) {
      reason = "Low confidence match";
    }

    const values = [
      ...rawFile.columns.map((col) => row[col] ?? ""),
      String(match.confidenceScore),
      match.matchType,
      match.status,
      reason,
    ];
    lines.push(rowToLine(values));
  }

  return lines.join("\n") + "\n";
}

export function buildMappingCsv(matches: MatchRow[]): string {
  const headers = [
    "Original Raw Value",
    "Standardized Value",
    "Confidence Score",
    "Match Type",
    "Decision",
  ];

  const lines: string[] = [rowToLine(headers)];

  const seen = new Set<string>();

  for (const match of matches) {
    if (match.status !== "approved" && match.status !== "corrected") continue;

    const standardized =
      match.status === "corrected"
        ? match.correctedValue ?? ""
        : match.suggestedValue ?? "";

    if (!standardized) continue;

    const key = `${match.originalValue}|||${standardized}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const values = [
      match.originalValue,
      standardized,
      String(match.confidenceScore),
      match.matchType,
      match.status,
    ];
    lines.push(rowToLine(values));
  }

  return lines.join("\n") + "\n";
}
