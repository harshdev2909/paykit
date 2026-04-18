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
          <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>}>
            <DashboardAuth>{children}</DashboardAuth>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
