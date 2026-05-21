import fs from "fs";
import path from "path";

const USAGE_FILE_NAME = ".session_usage.json";

export interface SessionUsageEvent {
  timestamp: string;
  cost_usd: number;
  costUsd: number;
  invocation_count: number;
  invocationCount: number;
}

export interface SessionUsage {
  events: SessionUsageEvent[];
}

export interface SafeguardConfig {
  maxSessionCostUsd?: number;
  maxSyncCallsPerHour?: number;
}

/**
 * Loads safeguard configuration from environment variables and cortex.json.
 * Environment variables take precedence.
 */
export function loadSafeguardConfig(projectRoot: string): SafeguardConfig {
  const config: SafeguardConfig = {};

  // 1. Read environment variables first
  if (process.env.CORTEX_MAX_SESSION_COST_USD) {
    const val = parseFloat(process.env.CORTEX_MAX_SESSION_COST_USD);
    if (!isNaN(val)) {
      config.maxSessionCostUsd = val;
    }
  }
  if (process.env.CORTEX_MAX_SYNC_CALLS_PER_HOUR) {
    const val = parseInt(process.env.CORTEX_MAX_SYNC_CALLS_PER_HOUR, 10);
    if (!isNaN(val)) {
      config.maxSyncCallsPerHour = val;
    }
  }

  // 2. Read cortex.json config if variables are missing
  try {
    const configPath = path.join(projectRoot, "cortex.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const json = JSON.parse(raw);
      if (json.safeguards && typeof json.safeguards === "object") {
        const sg = json.safeguards;
        
        // Support both camelCase and snake_case for maxSessionCostUsd
        if (config.maxSessionCostUsd === undefined) {
          const costVal = sg.maxSessionCostUsd ?? sg.max_session_cost_usd;
          if (typeof costVal === "number" || typeof costVal === "string") {
            const parsed = parseFloat(costVal as string);
            if (!isNaN(parsed)) {
              config.maxSessionCostUsd = parsed;
            }
          }
        }

        // Support both camelCase and snake_case for maxSyncCallsPerHour
        if (config.maxSyncCallsPerHour === undefined) {
          const syncVal = sg.maxSyncCallsPerHour ?? sg.max_sync_calls_per_hour;
          if (typeof syncVal === "number" || typeof syncVal === "string") {
            const parsed = parseInt(syncVal as string, 10);
            if (!isNaN(parsed)) {
              config.maxSyncCallsPerHour = parsed;
            }
          }
        }
      }
    }
  } catch {
    // Ignore reading or parsing errors, proceed with existing config
  }

  return config;
}

/**
 * Simple inter-process lock using atomic directory creation.
 */
async function withLock<T>(projectRoot: string, fn: () => Promise<T>): Promise<T> {
  const knowledgeDir = path.join(projectRoot, ".knowledge");
  const lockDir = path.join(knowledgeDir, ".session_usage.lock");
  const maxRetries = 50; // 50 * 100ms = 5 seconds

  if (!fs.existsSync(knowledgeDir)) {
    await fs.promises.mkdir(knowledgeDir, { recursive: true }).catch(() => {});
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.promises.mkdir(lockDir);
      // We got the lock
      try {
        return await fn();
      } finally {
        await fs.promises.rmdir(lockDir).catch(() => {});
      }
    } catch (e: any) {
      if (e.code === 'EEXIST') {
        // Wait and retry
        await new Promise(r => setTimeout(r, 100));
      } else {
        throw e;
      }
    }
  }
  throw new Error("Timeout acquiring lock for session usage ledger. Another process might be hung.");
}

/**
 * Reads all session usage records from .session_usage.json, pruning events older than 24 hours.
 */
export async function readSessionUsage(projectRoot: string): Promise<SessionUsage> {
  const filePath = path.join(projectRoot, ".knowledge", USAGE_FILE_NAME);
  if (!fs.existsSync(filePath)) {
    return { events: [] };
  }

  try {
    const raw = await fs.promises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as SessionUsage;
    if (!parsed || !Array.isArray(parsed.events)) {
      return { events: [] };
    }

    // Auto-prune events older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const activeEvents = parsed.events.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return !isNaN(t) && t >= cutoff;
    });

    return { events: activeEvents };
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return { events: [] };
    }
    // Fail-closed security design: if the ledger is corrupted, do NOT silently reset to $0
    throw new Error(`Corrupted session usage file: ${e.message}. Please delete it manually or use 'cortex config -c clear' to reset safeguards.`);
  }
}

/**
 * Writes the session usage registry to .session_usage.json safely using atomic temp-file rename.
 */
export async function writeSessionUsage(projectRoot: string, usage: SessionUsage): Promise<void> {
  const knowledgeDir = path.join(projectRoot, ".knowledge");
  if (!fs.existsSync(knowledgeDir)) {
    await fs.promises.mkdir(knowledgeDir, { recursive: true });
  }

  const filePath = path.join(knowledgeDir, USAGE_FILE_NAME);
  const tmpPath = filePath + ".tmp";

  // Auto-prune events older than 24 hours before writing
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const prunedEvents = usage.events.filter(e => {
    const t = new Date(e.timestamp).getTime();
    return !isNaN(t) && t >= cutoff;
  });

  // Atomic write pattern: write to tmp, then rename
  await fs.promises.writeFile(
    tmpPath,
    JSON.stringify({ events: prunedEvents }, null, 2),
    "utf-8"
  );
  await fs.promises.rename(tmpPath, filePath);
}

/**
 * Validates cost and rolling rate-limit safeguards before running an LLM call.
 * Throws an descriptive Error if any limits are crossed.
 */
export async function checkBudgetBeforeSync(projectRoot: string, estimatedCost: number): Promise<void> {
  return await withLock(projectRoot, async () => {
    const config = loadSafeguardConfig(projectRoot);
    const usage = await readSessionUsage(projectRoot);

    // 1. Session cost check (Rolling 24h Cost)
    if (config.maxSessionCostUsd !== undefined) {
      const cumulativeSpent = usage.events.reduce((sum, e) => sum + (e.costUsd || 0), 0);
      const projectedSpent = cumulativeSpent + estimatedCost;
      if (projectedSpent > config.maxSessionCostUsd) {
        throw new Error(
          `Budget Exceeded: Rolling 24h cost of $${projectedSpent.toFixed(4)} exceeds the hard limit of $${config.maxSessionCostUsd.toFixed(4)}.`
        );
      }
    }

    // 2. Rolling hourly sync frequency check
    if (config.maxSyncCallsPerHour !== undefined) {
      const cutoffOneHour = Date.now() - 60 * 60 * 1000;
      const syncsInLastHour = usage.events.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return !isNaN(t) && t >= cutoffOneHour;
      }).length;

      if (syncsInLastHour >= config.maxSyncCallsPerHour) {
        throw new Error(
          `Rate Limit Exceeded: Sync calls capped at ${config.maxSyncCallsPerHour} per hour to prevent runaway sessions.`
        );
      }
    }
  });
}

/**
 * Appends a successful sync run details to .session_usage.json
 */
export async function recordSyncEvent(projectRoot: string, costUsd: number): Promise<SessionUsageEvent> {
  return await withLock(projectRoot, async () => {
    const usage = await readSessionUsage(projectRoot);
    
    const nextInvocationCount = usage.events.length + 1;
    const event: SessionUsageEvent = {
      timestamp: new Date().toISOString(),
      cost_usd: costUsd,
      costUsd: costUsd,
      invocation_count: nextInvocationCount,
      invocationCount: nextInvocationCount,
    };

    usage.events.push(event);
    await writeSessionUsage(projectRoot, usage);
    return event;
  });
}
