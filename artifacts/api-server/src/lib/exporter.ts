import type { ParsedFile, MatchRow } from "./session-store";

// Leading characters that spreadsheet apps (Excel, Google Sheets) interpret as
// the start of a formula. Cells beginning with one of these are prefixed with a
// single quote so they are treated as literal text — preventing CSV injection.
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function escapeCsv(value: string | null | undefined): string {
  let str = value ?? "";
  if (str.length > 0 && FORMULA_TRIGGERS.has(str[0])) {
    str = `'${str}`;
  }
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
    // Use the exact same resolution the cleaned export uses, so the mapping
    // file always agrees with the standardized values written to cleaned-data.
    const standardized = resolvedValue(match);
    if (!standardized) continue;

    const changed = standardized !== (match.originalValue ?? "");
    const isPositiveMatch =
      match.matchType === "exact" ||
      match.matchType === "normalized" ||
      match.matchType === "fuzzy";
    const isDecision = match.status === "approved" || match.status === "corrected";

    // A finalized mapping is an auto-applied real match (exact/normalized/fuzzy)
    // or an explicit user decision (approved/corrected). Skip ignored/no-match
    // rows unless the cleaned export actually changed the value.
    if (!isPositiveMatch && !isDecision && !changed) continue;
    if (match.status === "ignored" && !changed) continue;

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
