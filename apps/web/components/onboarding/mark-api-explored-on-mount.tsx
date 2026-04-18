"use client";

import * as React from "react";

import { onboardingMarkApiExplored } from "@/lib/onboarding/dashboard-onboarding-storage";

/** Marks onboarding step “Explore the API” when the user lands on Playground or Demo. */
export function MarkApiExploredOnMount() {
  React.useEffect(() => {
    onboardingMarkApiExplored();
  }, []);
  return null;
}
