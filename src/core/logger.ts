import pino from "pino";
import path from "path";

/**
 * Daemon logger: human-readable stdout (pino-pretty) + JSON lines in `cortex.log` at project root.
 */
export function createDaemonLogger(projectRoot: string) {
  const logPath = path.join(projectRoot, "cortex.log");
  return pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
      targets: [
        {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss Z",
            destination: 2, // STDERR — keeps STDOUT clean for MCP stdio transport
          },
          level: "info",
        },
        {
          target: "pino/file",
          options: { destination: logPath, append: true, mkdir: false },
          level: "info",
        },
      ],
    },
  });
}
