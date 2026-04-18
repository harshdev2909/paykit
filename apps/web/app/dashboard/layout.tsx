import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardAuth } from "./DashboardAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen p-4 pt-16 lg:pt-4 lg:p-8">
          <Suspense
            fallback={
              <div className="space-y-6 py-4" aria-busy="true">
                <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
                <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />
              </div>
            }
          >
            <DashboardAuth>{children}</DashboardAuth>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
