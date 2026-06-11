import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { UploadCloud, FileSpreadsheet, Play, CheckCircle2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { sessionId, setSessionId, rawFile, setRawFile, masterFile, setMasterFile } = useSession();
  
  const [isUploadingRaw, setIsUploadingRaw] = useState(false);
  const [isUploadingMaster, setIsUploadingMaster] = useState(false);

  const rawInputRef = useRef<HTMLInputElement>(null);
  const masterInputRef = useRef<HTMLInputElement>(null);

  const handleRawUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRaw(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${import.meta.env.BASE_URL}api/upload/raw`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setSessionId(data.sessionId);
      setRawFile(data);
      toast({ title: "Raw file uploaded successfully" });
    } catch (err) {
      toast({ title: "Error uploading raw file", variant: "destructive" });
    } finally {
      setIsUploadingRaw(false);
    }
  };

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) {
      toast({ title: "Please upload the raw file first to create a session", variant: "destructive" });
      return;
    }

    setIsUploadingMaster(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", sessionId);
      const res = await fetch(`${import.meta.env.BASE_URL}api/upload/master`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setMasterFile(data);
      toast({ title: "Master file uploaded successfully" });
    } catch (err) {
      toast({ title: "Error uploading master file", variant: "destructive" });
    } finally {
      setIsUploadingMaster(false);
    }
  };

  const loadDemoData = async () => {
    toast({ title: "Demo data loaded (Mock)" });
    // For a real implementation, you'd fetch known demo files or trigger a mock response.
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Cure messy spreadsheets into clean, standardized data.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your raw data, provide a trusted master list, and let Data Foundry automatically standardize mismatched records with high-precision fuzzy matching.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/40 hover:border-primary/50 transition-colors">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className={`p-4 rounded-full ${rawFile ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {rawFile ? <CheckCircle2 className="w-8 h-8" /> : <FileSpreadsheet className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-xl font-semibold">1. Raw Data (CSV)</h3>
              <p className="text-sm text-muted-foreground mt-1">The messy data that needs cleaning</p>
            </div>
            {rawFile ? (
              <div className="text-sm font-medium text-primary">
                {rawFile.filename} ({rawFile.rowCount} rows)
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={rawInputRef}
                  onChange={handleRawUpload}
                  data-testid="input-raw-file"
                />
                <Button 
                  onClick={() => rawInputRef.current?.click()}
                  disabled={isUploadingRaw}
                  className="w-full"
                  data-testid="button-upload-raw"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isUploadingRaw ? "Uploading..." : "Upload Raw CSV"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={`border-border/50 transition-colors ${!sessionId ? 'opacity-50 grayscale cursor-not-allowed' : 'bg-card/40 hover:border-primary/50'}`}>
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className={`p-4 rounded-full ${masterFile ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {masterFile ? <CheckCircle2 className="w-8 h-8" /> : <FileSpreadsheet className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-xl font-semibold">2. Master List (CSV)</h3>
              <p className="text-sm text-muted-foreground mt-1">The source of truth to match against</p>
            </div>
            {masterFile ? (
              <div className="text-sm font-medium text-primary">
                {masterFile.filename} ({masterFile.rowCount} rows)
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={masterInputRef}
                  onChange={handleMasterUpload}
                  disabled={!sessionId}
                  data-testid="input-master-file"
                />
                <Button 
                  onClick={() => masterInputRef.current?.click()}
                  disabled={!sessionId || isUploadingMaster}
                  className="w-full"
                  variant="secondary"
                  data-testid="button-upload-master"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isUploadingMaster ? "Uploading..." : "Upload Master CSV"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 space-y-4 border-t border-border/50">
        <Button 
          size="lg" 
          disabled={!rawFile || !masterFile}
          onClick={() => setLocation("/map")}
          className="w-full md:w-auto min-w-[240px] text-lg font-semibold"
          data-testid="button-continue-map"
        >
          Continue to Column Mapping
          <Play className="w-5 h-5 ml-2" />
        </Button>
        <button 
          onClick={loadDemoData}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
          data-testid="button-load-demo"
        >
          Or load demo data to try it out
        </button>
      </div>
    </div>
  );
}
