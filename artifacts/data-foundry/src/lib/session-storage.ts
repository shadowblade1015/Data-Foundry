import type { UploadResult } from "@workspace/api-client-react";

// Plain (non-React) persistence helpers for the curing session. These live in
// their own module so that session.tsx only exports React components/hooks and
// stays a valid React Fast Refresh boundary.

const STORAGE_KEY = "data-foundry-session";

export type CureStatus = "idle" | "running" | "done";

export interface PersistedSession {
  sessionId: string | null;
  cureStatus: CureStatus;
  rawFile: UploadResult | null;
  masterFile: UploadResult | null;
  rawColumn: string | null;
  masterColumn: string | null;
  outputColumnName: string;
}

// Strip preview rows before persisting: those contain actual uploaded cell
// data, and we only want lightweight metadata (filename/columns/row count)
// to satisfy page guards after a refresh.
export function stripContent(file: UploadResult | null): UploadResult | null {
  if (!file) return null;
  return { ...file, preview: [] };
}

export function loadPersisted(): Partial<PersistedSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedSession>) : {};
  } catch {
    return {};
  }
}

export function persistSession(data: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore storage errors (quota, privacy mode) */
  }
}

export function clearPersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}
