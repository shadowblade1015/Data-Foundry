import type { ParsedFile, MatchRow } from "./session-store";

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToLine(values: string[]): string {
  return values.map(escapeCsv).join(",");
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

    const standardized =
      match?.status === "corrected"
        ? match.correctedValue ?? ""
        : match?.status === "approved" || match?.matchType === "exact" || match?.matchType === "normalized"
        ? match.suggestedValue ?? ""
        : match?.status === "ignored"
        ? ""
        : match?.suggestedValue ?? "";

    const values = [
      ...rawFile.columns.map((col) => row[col] ?? ""),
      standardized,
      match ? String(match.confidenceScore) : "0",
      match ? match.matchType : "none",
      match ? match.status : "pending",
    ];
    lines.push(rowToLine(values));
  }

  return lines.join("\n");
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

    const isException =
      match.matchType === "none" ||
      match.status === "ignored" ||
      match.confidenceScore < 75 ||
      !match.originalValue ||
      match.originalValue.trim() === "";

    if (!isException) continue;

    let reason = "";
    if (!match.originalValue || match.originalValue.trim() === "") {
      reason = "Blank value";
    } else if (match.status === "ignored") {
      reason = "Ignored by user";
    } else if (match.matchType === "none") {
      reason = "No confident match found";
    } else if (match.confidenceScore < 75) {
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

  return lines.join("\n");
}

export function buildMappingCsv(matches: MatchRow[]): string {
  const headers = [
    "Original Raw Value",
    "Approved Standardized Value",
    "Confidence Score",
    "Match Type",
    "Approved Status",
  ];

  const lines: string[] = [rowToLine(headers)];

  for (const match of matches) {
    const approvedValue =
      match.status === "corrected"
        ? match.correctedValue ?? ""
        : match.status === "approved"
        ? match.suggestedValue ?? ""
        : "";

    const values = [
      match.originalValue,
      approvedValue,
      String(match.confidenceScore),
      match.matchType,
      match.status,
    ];
    lines.push(rowToLine(values));
  }

  return lines.join("\n");
}
