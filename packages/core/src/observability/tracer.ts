import { trace, context, type Span, type Tracer } from "@opentelemetry/api";

const TRACER_NAME = "free-ai-gateway-core";

/**
 * Mengambil instance tracer untuk gateway.
 */
export function getGatewayTracer(): Tracer {
  return trace.getTracer(TRACER_NAME);
}

/**
 * Helper untuk membungkus fungsi asinkron dengan OTel Span.
 * Ini memungkinkan pembuatan tracing waterfall yang jelas di dashboard analitik.
 */
export async function withTrace<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getGatewayTracer();
  
  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttributes(attributes);
    try {
      const result = await fn(span);
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // 2 = ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
