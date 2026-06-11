import { useEffect } from "react";
import { useLocation } from "wouter";
import { Download, FileDown, TableProperties, AlertCircle } from "lucide-react";
import { useSession } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExportPage() {
  const [, setLocation] = useLocation();
  const { sessionId, cureStatus, resetSession } = useSession();

  useEffect(() => {
    if (!sessionId || cureStatus !== "done") {
      setLocation("/");
    }
  }, [sessionId, cureStatus, setLocation]);

  if (!sessionId || cureStatus !== "done") return null;

  const handleDownload = (type: "cleaned" | "exceptions" | "mapping") => {
    window.location.href = `${import.meta.env.BASE_URL}api/session/${sessionId}/export/${type}`;
  };

  const handleStartOver = () => {
    resetSession();
    setLocation("/");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Export Your Data</h1>
        <p className="text-muted-foreground">Download your standardized results and start a new session.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-primary/30 bg-primary/5 flex flex-col">
          <CardHeader>
            <div className="p-3 bg-primary/20 w-fit rounded-lg mb-4 text-primary">
              <FileDown className="w-6 h-6" />
            </div>
            <CardTitle>Cleaned Data</CardTitle>
            <CardDescription>The full original dataset with your new standardized column appended.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-4">
            <Button 
              className="w-full" 
              onClick={() => handleDownload("cleaned")}
              data-testid="button-download-cleaned"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Cleaned CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="p-3 bg-amber-500/10 w-fit rounded-lg mb-4 text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle>Exceptions Report</CardTitle>
            <CardDescription>Only rows that had no match, errors, or low confidence scores.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-4">
            <Button 
              variant="outline" 
              className="w-full border-amber-500/20 hover:bg-amber-500/10 text-amber-500"
              onClick={() => handleDownload("exceptions")}
              data-testid="button-download-exceptions"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Exceptions
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="p-3 bg-muted w-fit rounded-lg mb-4 text-muted-foreground">
              <TableProperties className="w-6 h-6" />
            </div>
            <CardTitle>Mapping Rules</CardTitle>
            <CardDescription>A dictionary of "Raw Value" → "Standardized Value" to reuse in other tools.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-4">
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => handleDownload("mapping")}
              data-testid="button-download-mapping"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Mapping
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-12 border-t border-border mt-12">
        <Button variant="ghost" className="text-muted-foreground" onClick={handleStartOver} data-testid="button-start-over">
          Start a new session
        </Button>
      </div>
    </div>
  );
}
