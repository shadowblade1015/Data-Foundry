import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { SessionProvider } from "@/lib/session";
import { Layout } from "@/components/layout";
import UploadPage from "@/pages/upload";
import MapPage from "@/pages/map";
import ReviewPage from "@/pages/review";
import SummaryPage from "@/pages/summary";
import ExportPage from "@/pages/export";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={UploadPage} />
        <Route path="/map" component={MapPage} />
        <Route path="/review" component={ReviewPage} />
        <Route path="/summary" component={SummaryPage} />
        <Route path="/export" component={ExportPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </SessionProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
