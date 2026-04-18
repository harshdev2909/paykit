import { DemoInteractive } from "./demo-interactive";

export default function DemoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-[calc(100dvh-10rem)] lg:max-h-[calc(100dvh-10rem)]">
      <DemoInteractive />
    </div>
  );
}
