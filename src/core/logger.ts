import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "HH:MM:ss Z",
    },
  },
});

// Helper for daemon logs
export const daemonLogger = logger.child({ component: "daemon" });
export const mcpLogger = logger.child({ component: "mcp" });
