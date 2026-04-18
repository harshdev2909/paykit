/** localStorage keys for dashboard onboarding (UI prefs only — not secrets). */

export const ONBOARDING_DISMISS_KEY = "paykit_dashboard_onboarding_v1_dismissed";
export const ONBOARDING_API_EXPLORED_KEY = "paykit_onboarding_api_explored_v1";

export function onboardingIsDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function onboardingSetDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function onboardingHasExploredApi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_API_EXPLORED_KEY) === "1";
  } catch {
    return false;
  }
}

export function onboardingMarkApiExplored(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_API_EXPLORED_KEY, "1");
  } catch {
    /* ignore */
  }
}
