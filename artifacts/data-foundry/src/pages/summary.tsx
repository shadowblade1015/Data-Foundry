import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/lib/session";
import { useGetQualitySummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Database, ShieldAlert, CheckCircle, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryPage() {
  const [, setLocation] = useLocation();
  const { sessionId, cureStatus } = useSession();

  useEffect(() => {
    if (!sessionId || cureStatus !== "done") {
      setLocation("/");
    }
  }, [sessionId, cureStatus, setLocation]);

  const { data: summary, isLoading, error } = useGetQualitySummary(sessionId || "", {
    query: {
      enabled: !!sessionId,
      queryKey: [`/api/session/${sessionId}/summary`] as const
    }
  });

  if (!sessionId || cureStatus !== "done") return null;

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-destructive">
        Error loading summary. Please try refreshing.
      </div>
    );
  }

  const matchRate = summary.totalRows > 0 
    ? Math.round(((summary.exactMatches + summary.normalizedMatches + summary.fuzzyMatches) / summary.totalRows) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Summary</h1>
          <p className="text-muted-foreground mt-1">Review the overall results of your data curing session.</p>
        </div>
        <Button size="lg" onClick={() => setLocation("/export")} data-testid="button-continue-export">
          Continue to Export
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Total Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{summary.totalRows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Rows analyzed from raw data</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Overall Match Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{matchRate}%</div>
            <p className="text-xs text-primary/80 mt-1">Found suggestions for {summary.exactMatches + summary.normalizedMatches + summary.fuzzyMatches} rows</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-500">{summary.noMatch + summary.blankValues}</div>
            <p className="text-xs text-muted-foreground mt-1">No match ({summary.noMatch}) + Blank ({summary.blankValues})</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight border-b border-border pb-2">Match Types Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Exact Matches" value={summary.exactMatches} desc="100% identical strings" />
          <StatCard title="Normalized" value={summary.normalizedMatches} desc="Matched after cleaning whitespace/case" />
          <StatCard title="Fuzzy Matches" value={summary.fuzzyMatches} desc="Similar spelling or partial match" />
          <StatCard title="Needs Review" value={summary.needsReview} desc="Score between 75-89" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight border-b border-border pb-2">Decisions Applied</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Approved" value={summary.approved} desc="Accepted as suggested" icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
          <StatCard title="Corrected" value={summary.corrected} desc="Manually overridden" />
          <StatCard title="Ignored" value={summary.ignored} desc="Kept original value" />
          <StatCard title="Pending" value={summary.pending} desc="Awaiting decision" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, desc, icon }: { title: string, value: number, desc: string, icon?: React.ReactNode }) {
  return (
    <Card className="border-border/30 bg-muted/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</div>
          {icon}
        </div>
        <div className="text-2xl font-bold mb-1">{value.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </CardContent>
    </Card>
  );
}
