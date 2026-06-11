import { createContext, useContext, useState, ReactNode } from "react";
import { UploadResult, MatchRow } from "@workspace/api-client-react";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<UploadResult | null>(null);
  const [masterFile, setMasterFile] = useState<UploadResult | null>(null);
  const [rawColumn, setRawColumn] = useState<string | null>(null);
  const [masterColumn, setMasterColumn] = useState<string | null>(null);
  const [outputColumnName, setOutputColumnName] = useState<string>("Standardized Value");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [cureStatus, setCureStatus] = useState<"idle" | "running" | "done">("idle");

  const resetSession = () => {
    setSessionId(null);
    setRawFile(null);
    setMasterFile(null);
    setRawColumn(null);
    setMasterColumn(null);
    setOutputColumnName("Standardized Value");
    setMatches([]);
    setCureStatus("idle");
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
