import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useSession } from "@/lib/session";

function StepIndicator() {
  const [location] = useLocation();
  const { sessionId, rawFile, masterFile, cureStatus } = useSession();

  const steps = [
    { name: "Upload", path: "/" },
    { name: "Map", path: "/map", disabled: !sessionId || !rawFile || !masterFile },
    { name: "Review", path: "/review", disabled: cureStatus !== "done" },
    { name: "Summary", path: "/summary", disabled: cureStatus !== "done" },
    { name: "Export", path: "/export", disabled: cureStatus !== "done" },
  ];

  return (
    <div className="flex items-center space-x-2 text-sm font-medium">
      {steps.map((step, index) => {
        const isActive = location === step.path;
        return (
          <div key={step.name} className="flex items-center">
            {index > 0 && <span className="mx-2 text-muted-foreground/50">/</span>}
            {step.disabled ? (
              <span className="text-muted-foreground opacity-50 cursor-not-allowed">
                {step.name}
              </span>
            ) : (
              <Link
                href={step.path}
                className={`transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.name}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-primary leading-tight">
              Data Foundry
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              Horizon Forge Systems
            </span>
          </div>
          <StepIndicator />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
