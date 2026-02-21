type LogLevel = "info" | "warn" | "error";

interface LogContext {
  fn: string;
  jobId?: string;
  userId?: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, ctx: LogContext, message: string, extra?: unknown): string {
  const base: Record<string, unknown> = {
    level,
    fn: ctx.fn,
    msg: message,
    ts: new Date().toISOString(),
  };

  if (ctx.jobId) base.jobId = ctx.jobId;
  if (ctx.userId) base.userId = ctx.userId;

  const { fn, jobId, userId, ...rest } = ctx;
  for (const [k, v] of Object.entries(rest)) {
    base[k] = v;
  }

  if (extra !== undefined) {
    if (extra instanceof Error) {
      base.error = extra.message;
      base.stack = extra.stack;
    } else {
      base.detail = extra;
    }
  }

  return JSON.stringify(base);
}

export function createLogger(ctx: LogContext) {
  return {
    info: (msg: string, extra?: unknown) => console.log(formatEntry("info", ctx, msg, extra)),
    warn: (msg: string, extra?: unknown) => console.warn(formatEntry("warn", ctx, msg, extra)),
    error: (msg: string, extra?: unknown) => console.error(formatEntry("error", ctx, msg, extra)),
    child: (overrides: Partial<LogContext>) => createLogger({ ...ctx, ...overrides }),
  };
}
