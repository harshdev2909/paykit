import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | undefined;

/**
 * Opt-in OpenTelemetry for the API process. Disabled when `OTEL_SDK_DISABLED=true`.
 * Enable by setting either:
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` (HTTP OTLP), or
 * - `OTEL_TRACES_EXPORTER=console` for local trace logging.
 */
export function initTelemetry(): void {
  if (process.env.OTEL_SDK_DISABLED === "true") return;

  const tracesConsole = process.env.OTEL_TRACES_EXPORTER === "console";
  const hasOtlp =
    Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT) ||
    Boolean(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

  if (!tracesConsole && !hasOtlp) {
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME ?? "paykit-api";
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  });

  const traceExporter = tracesConsole ? new ConsoleSpanExporter() : new OTLPTraceExporter();

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.once("SIGTERM", () => {
    void sdk?.shutdown();
  });
}

/** Runs when this module is loaded; keep `import "./telemetry"` before `./api` in entrypoints. */
initTelemetry();
