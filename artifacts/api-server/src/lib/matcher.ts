import Fuse from "fuse.js";
import type { MatchRow } from "./session-store";

const PUNCTUATION_RE = /[^\w\s]/g;
const MULTI_SPACE_RE = /\s+/g;

const ABBREVIATIONS: Record<string, string> = {
  univ: "university",
  uni: "university",
  coll: "college",
  col: "college",
  intl: "international",
  fl: "florida",
  "st": "saint",
  ctr: "center",
  inst: "institute",
  tech: "technology",
  comm: "community",
};

export function normalize(value: string): string {
  if (!value) return "";
  let v = value.toLowerCase().trim();
  v = v.replace(PUNCTUATION_RE, " ");
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    const re = new RegExp(`\\b${abbr}\\b`, "gi");
    v = v.replace(re, full);
  }
  v = v.replace(MULTI_SPACE_RE, " ").trim();
  return v;
}

export function matchRows(
  rawValues: string[],
  masterValues: string[]
): MatchRow[] {
  const masterNorm = masterValues.map((v) => ({ original: v, normalized: normalize(v) }));

  const fuse = new Fuse(masterValues, {
    includeScore: true,
    threshold: 0.6,
    distance: 100,
    minMatchCharLength: 2,
  });

  const results: MatchRow[] = [];

  for (let rowIndex = 0; rowIndex < rawValues.length; rowIndex++) {
    const rawVal = rawValues[rowIndex];

    if (!rawVal || rawVal.trim() === "") {
      results.push({
        rowIndex,
        originalValue: rawVal ?? "",
        suggestedValue: null,
        confidenceScore: 0,
        matchType: "none",
        status: "pending",
        correctedValue: null,
      });
      continue;
    }

    const exactIdx = masterValues.findIndex((mv) => mv === rawVal);
    if (exactIdx !== -1) {
      results.push({
        rowIndex,
        originalValue: rawVal,
        suggestedValue: masterValues[exactIdx],
        confidenceScore: 100,
        matchType: "exact",
        status: "pending",
        correctedValue: null,
      });
      continue;
    }

    const normRaw = normalize(rawVal);
    const normIdx = masterNorm.findIndex((mn) => mn.normalized === normRaw);
    if (normIdx !== -1) {
      results.push({
        rowIndex,
        originalValue: rawVal,
        suggestedValue: masterNorm[normIdx].original,
        confidenceScore: 95,
        matchType: "normalized",
        status: "pending",
        correctedValue: null,
      });
      continue;
    }

    const fuseResults = fuse.search(rawVal);
    if (fuseResults.length > 0) {
      const best = fuseResults[0];
      const score = best.score !== undefined ? Math.round((1 - best.score) * 100) : 0;

      if (score >= 75) {
        results.push({
          rowIndex,
          originalValue: rawVal,
          suggestedValue: best.item,
          confidenceScore: score,
          matchType: "fuzzy",
          status: "pending",
          correctedValue: null,
        });
      } else {
        results.push({
          rowIndex,
          originalValue: rawVal,
          suggestedValue: best.item,
          confidenceScore: score,
          matchType: "none",
          status: "pending",
          correctedValue: null,
        });
      }
    } else {
      results.push({
        rowIndex,
        originalValue: rawVal,
        suggestedValue: null,
        confidenceScore: 0,
        matchType: "none",
        status: "pending",
        correctedValue: null,
      });
    }
  }

  return results;
}

export function computeQualitySummary(matches: MatchRow[], rawValues: string[]) {
  const totalRows = matches.length;
  const uniqueRawValues = new Set(rawValues.filter((v) => v && v.trim())).size;
  const valueCounts = new Map<string, number>();
  for (const v of rawValues) {
    if (v && v.trim()) {
      valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
    }
  }
  const duplicateValues = [...valueCounts.values()].filter((c) => c > 1).length;

  let exactMatches = 0;
  let normalizedMatches = 0;
  let fuzzyMatches = 0;
  let needsReview = 0;
  let noMatch = 0;
  let blankValues = 0;
  let approved = 0;
  let corrected = 0;
  let ignored = 0;
  let pending = 0;

  for (const m of matches) {
    if (!m.originalValue || m.originalValue.trim() === "") {
      blankValues++;
    }
    if (m.matchType === "exact") exactMatches++;
    else if (m.matchType === "normalized") normalizedMatches++;
    else if (m.matchType === "fuzzy") {
      if (m.confidenceScore >= 90) {
        fuzzyMatches++;
      } else {
        needsReview++;
      }
    } else {
      noMatch++;
    }

    if (m.status === "approved") approved++;
    else if (m.status === "corrected") corrected++;
    else if (m.status === "ignored") ignored++;
    else pending++;
  }

  return {
    totalRows,
    uniqueRawValues,
    exactMatches,
    normalizedMatches,
    fuzzyMatches,
    needsReview,
    noMatch,
    blankValues,
    duplicateValues,
    approved,
    corrected,
    ignored,
    pending,
  };
}
