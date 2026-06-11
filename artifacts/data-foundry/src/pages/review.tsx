import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, X, Edit2, Save } from "lucide-react";
import { useSession } from "@/lib/session";
import { useUpdateDecisions, MatchRow } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type FilterTab = "all" | "exact" | "strong" | "review" | "none";

export default function ReviewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { sessionId, matches, setMatches, cureStatus } = useSession();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const updateDecisionsMutation = useUpdateDecisions();

  useEffect(() => {
    if (!sessionId || cureStatus !== "done") {
      setLocation("/");
    }
  }, [sessionId, cureStatus, setLocation]);

  if (!sessionId || cureStatus !== "done") return null;

  const handleDecision = (rowIndex: number, status: MatchRow["status"], correctedValue?: string) => {
    const updatedMatches = matches.map(m => 
      m.rowIndex === rowIndex 
        ? { ...m, status, correctedValue: correctedValue !== undefined ? correctedValue : m.correctedValue } 
        : m
    );
    setMatches(updatedMatches);
  };

  const saveEdit = (rowIndex: number) => {
    handleDecision(rowIndex, "corrected", editValue);
    setEditingRowIndex(null);
  };

  const handleSaveAllDecisions = () => {
    const decisionsToSave = matches
      .filter(m => m.status !== "pending")
      .map(m => ({
        rowIndex: m.rowIndex,
        status: m.status as any,
        correctedValue: m.correctedValue || null,
      }));

    if (decisionsToSave.length === 0) {
      setLocation("/summary");
      return;
    }

    updateDecisionsMutation.mutate({
      sessionId,
      data: { decisions: decisionsToSave }
    }, {
      onSuccess: () => {
        toast({ title: "Decisions saved" });
        setLocation("/summary");
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Failed to save decisions";
        toast({ title: "Save failed", description: message, variant: "destructive" });
      }
    });
  };

  const filteredMatches = matches.filter(m => {
    if (activeTab === "all") return true;
    if (activeTab === "exact") return m.matchType === "exact";
    if (activeTab === "strong") return m.matchType === "normalized" || (m.confidenceScore >= 90 && m.matchType === "fuzzy");
    if (activeTab === "review") return m.confidenceScore >= 75 && m.confidenceScore < 90;
    if (activeTab === "none") return m.matchType === "none" || m.confidenceScore < 75;
    return true;
  });

  const getScoreColor = (score: number, type: string) => {
    if (type === "none") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (score >= 90) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (score >= 75) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Matches</h1>
          <p className="text-muted-foreground">Approve suggestions or manually correct values before exporting.</p>
        </div>
        <Button 
          onClick={handleSaveAllDecisions}
          disabled={updateDecisionsMutation.isPending}
          className="whitespace-nowrap"
          data-testid="button-save-decisions"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateDecisionsMutation.isPending ? "Saving..." : "Save Decisions & Continue"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
            <TabsList className="bg-background">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="exact">Exact</TabsTrigger>
              <TabsTrigger value="strong">Strong (≥90)</TabsTrigger>
              <TabsTrigger value="review">Needs Review (75-89)</TabsTrigger>
              <TabsTrigger value="none">{"No Match (<75)"}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow>
                <TableHead className="w-16 text-center">Row</TableHead>
                <TableHead>Original Value</TableHead>
                <TableHead>Suggested Value</TableHead>
                <TableHead className="w-24 text-center">Score</TableHead>
                <TableHead className="w-32 text-center">Type</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No matches found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((m) => (
                  <TableRow key={m.rowIndex} className="group hover:bg-muted/30">
                    <TableCell className="text-center text-muted-foreground text-xs font-mono">
                      {m.rowIndex}
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.originalValue || <span className="text-muted-foreground italic">{"<blank>"}</span>}
                    </TableCell>
                    
                    <TableCell>
                      {editingRowIndex === m.rowIndex ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            autoFocus
                            className="h-8 max-w-[200px]"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(m.rowIndex);
                              if (e.key === 'Escape') setEditingRowIndex(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => saveEdit(m.rowIndex)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingRowIndex(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={m.correctedValue ? 'text-primary font-medium' : ''}>
                            {m.correctedValue || m.suggestedValue || <span className="text-muted-foreground italic">{"<no suggestion>"}</span>}
                          </span>
                          {m.correctedValue && (
                            <Badge variant="outline" className="text-[10px] h-5 ml-2 border-primary/20 text-primary">
                              MANUAL
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {m.matchType !== "none" ? (
                        <Badge variant="outline" className={`font-mono ${getScoreColor(m.confidenceScore, m.matchType)}`}>
                          {m.confidenceScore}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-semibold">
                        {m.matchType}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      {m.status === 'approved' && <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-none">Approved</Badge>}
                      {m.status === 'corrected' && <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Corrected</Badge>}
                      {m.status === 'ignored' && <Badge variant="outline" className="text-muted-foreground">Ignored</Badge>}
                      {m.status === 'pending' && <span className="text-xs text-muted-foreground">Pending</span>}
                    </TableCell>

                    <TableCell className="text-right">
                      {editingRowIndex !== m.rowIndex && (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleDecision(m.rowIndex, "approved")}
                            title="Approve suggestion"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditValue(m.correctedValue || m.suggestedValue || m.originalValue);
                              setEditingRowIndex(m.rowIndex);
                            }}
                            title="Manual correction"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDecision(m.rowIndex, "ignored")}
                            title="Ignore / Keep original"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
