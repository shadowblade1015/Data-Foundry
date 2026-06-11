import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { useRunCuring } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function MapPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { 
    sessionId, rawFile, masterFile, 
    rawColumn, setRawColumn, 
    masterColumn, setMasterColumn,
    outputColumnName, setOutputColumnName,
    setMatches, setCureStatus 
  } = useSession();

  const runCuringMutation = useRunCuring();

  useEffect(() => {
    if (!sessionId || !rawFile || !masterFile) {
      setLocation("/");
    }
  }, [sessionId, rawFile, masterFile, setLocation]);

  if (!rawFile || !masterFile) return null;

  const handleRunCuring = () => {
    if (!sessionId || !rawColumn || !masterColumn) return;

    setCureStatus("running");
    runCuringMutation.mutate(
      { 
        sessionId, 
        data: { 
          rawColumn, 
          masterColumn, 
          outputColumnName 
        } 
      },
      {
        onSuccess: (data) => {
          setMatches(data.matches);
          setCureStatus("done");
          toast({ title: "Curing complete!" });
          setLocation("/review");
        },
        onError: () => {
          setCureStatus("idle");
          toast({ title: "Curing failed", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Column Mapping</h1>
          <p className="text-muted-foreground">Select the column you want to standardize and the master column to match against.</p>
        </div>
        <Button 
          onClick={handleRunCuring} 
          disabled={!rawColumn || !masterColumn || runCuringMutation.isPending}
          size="lg"
          data-testid="button-run-curing"
        >
          {runCuringMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5 mr-2" />
          )}
          Run Curing Process
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Raw Data Column</Label>
              <Select value={rawColumn || ""} onValueChange={setRawColumn}>
                <SelectTrigger className="w-full bg-background" data-testid="select-raw-column">
                  <SelectValue placeholder="Select column to cure..." />
                </SelectTrigger>
                <SelectContent>
                  {rawFile.columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:flex pt-10 text-muted-foreground items-center justify-center">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Master List Column</Label>
              <Select value={masterColumn || ""} onValueChange={setMasterColumn}>
                <SelectTrigger className="w-full bg-background" data-testid="select-master-column">
                  <SelectValue placeholder="Select target column..." />
                </SelectTrigger>
                <SelectContent>
                  {masterFile.columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Label className="text-sm font-semibold mb-2 block">Output Column Name (Optional)</Label>
            <Input 
              value={outputColumnName} 
              onChange={(e) => setOutputColumnName(e.target.value)}
              placeholder="e.g. Standardized Value"
              className="max-w-md bg-background"
              data-testid="input-output-column"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Raw File Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {rawFile.columns.map(col => (
                    <TableHead key={col} className={`whitespace-nowrap ${col === rawColumn ? 'text-primary font-bold bg-primary/10' : ''}`}>
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawFile.preview.map((row, i) => (
                  <TableRow key={i}>
                    {rawFile.columns.map(col => (
                      <TableCell key={col} className={`max-w-[200px] truncate ${col === rawColumn ? 'bg-primary/5' : ''}`}>
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Master File Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {masterFile.columns.map(col => (
                    <TableHead key={col} className={`whitespace-nowrap ${col === masterColumn ? 'text-primary font-bold bg-primary/10' : ''}`}>
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {masterFile.preview.map((row, i) => (
                  <TableRow key={i}>
                    {masterFile.columns.map(col => (
                      <TableCell key={col} className={`max-w-[200px] truncate ${col === masterColumn ? 'bg-primary/5' : ''}`}>
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
