type LogContext = Record<string, unknown>;

export function logError(error: unknown, context: LogContext = {}) {
  const payload = {
    level: "error",
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  console.error(JSON.stringify(payload));
}
