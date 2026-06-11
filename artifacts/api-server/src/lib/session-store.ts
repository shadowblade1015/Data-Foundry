import { randomUUID } from "crypto";

export interface ParsedFile {
  filename: string;
  rows: Record<string, string>[];
  columns: string[];
}

export interface MatchRow {
  rowIndex: number;
  originalValue: string;
  suggestedValue: string | null;
  confidenceScore: number;
  matchType: "exact" | "normalized" | "fuzzy" | "none";
  status: "approved" | "corrected" | "ignored" | "pending";
  correctedValue: string | null;
}

export interface SessionData {
  sessionId: string;
  createdAt: Date;
  rawFile: ParsedFile | null;
  masterFile: ParsedFile | null;
  rawColumn: string | null;
  masterColumn: string | null;
  outputColumnName: string;
  matches: MatchRow[];
}

const sessions = new Map<string, SessionData>();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt.getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanup, 15 * 60 * 1000);

export function createSession(): SessionData {
  const session: SessionData = {
    sessionId: randomUUID(),
    createdAt: new Date(),
    rawFile: null,
    masterFile: null,
    rawColumn: null,
    masterColumn: null,
    outputColumnName: "Standardized Value",
    matches: [],
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, updates: Partial<SessionData>): void {
  const session = sessions.get(sessionId);
  if (session) {
    Object.assign(session, updates);
  }
}
