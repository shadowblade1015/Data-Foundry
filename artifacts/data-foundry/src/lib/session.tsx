import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UploadResult, MatchRow } from "@workspace/api-client-react";

const STORAGE_KEY = "data-foundry-session";

type CureStatus = "idle" | "running" | "done";

interface PersistedSession {
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
function stripContent(file: UploadResult | null): UploadResult | null {
  if (!file) return null;
  return { ...file, preview: [] };
}

function loadPersisted(): Partial<PersistedSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedSession>) : {};
  } catch {
    return {};
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

interface SessionState {
  sessionId: string | null;
  rawFile: UploadResult | null;
  masterFile: UploadResult | null;
  rawColumn: string | null;
  masterColumn: string | null;
  outputColumnName: string;
  matches: MatchRow[];
  cureStatus: "idle" | "running" | "done";
}

interface SessionContextType extends SessionState {
  setSessionId: (id: string | null) => void;
  setRawFile: (file: UploadResult | null) => void;
  setMasterFile: (file: UploadResult | null) => void;
  setRawColumn: (col: string | null) => void;
  setMasterColumn: (col: string | null) => void;
  setOutputColumnName: (name: string) => void;
  setMatches: (matches: MatchRow[]) => void;
  setCureStatus: (status: "idle" | "running" | "done") => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadPersisted);
  const [sessionId, setSessionId] = useState<string | null>(initial.sessionId ?? null);
  const [rawFile, setRawFile] = useState<UploadResult | null>(initial.rawFile ?? null);
  const [masterFile, setMasterFile] = useState<UploadResult | null>(initial.masterFile ?? null);
  const [rawColumn, setRawColumn] = useState<string | null>(initial.rawColumn ?? null);
  const [masterColumn, setMasterColumn] = useState<string | null>(initial.masterColumn ?? null);
  const [outputColumnName, setOutputColumnName] = useState<string>(
    initial.outputColumnName ?? "Standardized Value"
  );
  // Matches are full uploaded-row data and can be large, so they are kept in
  // memory only — never persisted to browser storage.
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [cureStatus, setCureStatus] = useState<CureStatus>(initial.cureStatus ?? "idle");

  // Persist lightweight session metadata so a browser refresh does not destroy
  // the workflow. Uploaded file contents (preview rows, matches) are excluded.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionId) {
        const data: PersistedSession = {
          sessionId,
          cureStatus,
          rawFile: stripContent(rawFile),
          masterFile: stripContent(masterFile),
          rawColumn,
          masterColumn,
          outputColumnName,
        };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore storage errors (quota, privacy mode) */
    }
  }, [sessionId, cureStatus, rawFile, masterFile, rawColumn, masterColumn, outputColumnName]);

  const resetSession = () => {
    setSessionId(null);
    setRawFile(null);
    setMasterFile(null);
    setRawColumn(null);
    setMasterColumn(null);
    setOutputColumnName("Standardized Value");
    setMatches([]);
    setCureStatus("idle");
    clearPersistedSession();
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        rawFile,
        masterFile,
        rawColumn,
        masterColumn,
        outputColumnName,
        matches,
        cureStatus,
        setSessionId,
        setRawFile,
        setMasterFile,
        setRawColumn,
        setMasterColumn,
        setOutputColumnName,
        setMatches,
        setCureStatus,
        resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
