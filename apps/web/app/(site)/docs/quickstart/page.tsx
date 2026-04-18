import type { Metadata } from "next";
import { QuickstartClient } from "./quickstart-client";

export const metadata: Metadata = {
  title: "Quickstart · PayKit",
  description: "Ship a paid API endpoint in 5 minutes.",
};

export default function QuickstartPage() {
  return <QuickstartClient />;
}
