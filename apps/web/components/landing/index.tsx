import { FlowStrip } from "./flow-strip";
import { QuickstartCta } from "./quickstart-cta";
import { ThreePrimitives } from "./three-primitives";
import { WhyStellar } from "./why-stellar";

/** Below-the-fold landing sections (hero lives on the page). */
export function LandingBelowFold() {
  return (
    <>
      <FlowStrip />
      <ThreePrimitives />
      <WhyStellar />
      <QuickstartCta />
    </>
  );
}
