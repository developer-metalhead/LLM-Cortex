import { readTransactions, SavingsTransaction } from "../knowledge/ledger.js";
import fs from "fs";
import path from "path";

// ANSI Styling Helper
const STYLE = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
};

function stripAnsiCodes(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export async function runSavings(
  projectRoot: string,
  options: { graph?: boolean }
): Promise<void> {
  const report = await getSavingsReport(projectRoot, options);
  console.log(report);
}

export async function getSavingsReport(
  projectRoot: string,
  options: { graph?: boolean; stripAnsi?: boolean }
): Promise<string> {
  const transactions = await readTransactions(projectRoot);

  if (transactions.length === 0) {
    const raw = `\n  💡 No savings transactions recorded yet.\n  Run ingest or execute some MCP queries to start building your savings ledger!\n`;
    return options.stripAnsi ? raw : `\n  ${STYLE.yellow}💡 No savings transactions recorded yet.${STYLE.reset}\n  Run ingest or execute some MCP queries to start building your savings ledger!\n`;
  }

  let result = "";
  if (options.graph) {
    result = renderSavingsGraphString(transactions);
  } else {
    result = renderSavingsTableString(transactions);
  }

  // Auto-export ARCH_SAVINGS.md to project root
  try {
    const tablePart = renderSavingsTableString(transactions);
    const graphPart = renderSavingsGraphString(transactions);
    const cleanTable = stripAnsiCodes(tablePart);
    const cleanGraph = stripAnsiCodes(graphPart);

    const docContent = [
      `# 📈 Project Cortex — Token & Cost Savings Ledger & Analytics`,
      `*Generated dynamically on ${new Date().toISOString().split("T")[0]}*`,
      ``,
      `> [!NOTE]`,
      `> These statistics represent live telemetry captured directly from the project's local transaction ledger.`,
      ``,
      cleanTable.trim(),
      ``,
      cleanGraph.trim(),
    ].join("\n");

    const exportPath = path.join(projectRoot, "ARCH_SAVINGS.md");
    fs.writeFileSync(exportPath, docContent, "utf-8");
  } catch (err: any) {
    console.error(`[Cortex] Failed to export ARCH_SAVINGS.md: ${err.message}`);
  }

  if (options.stripAnsi) {
    return stripAnsiCodes(result);
  }
  return result;
}

function renderSavingsTableString(transactions: SavingsTransaction[]): string {
  // Aggregate Metrics
  let totalSavedTokens = 0;
  let totalOriginalTokens = 0;
  let totalSavedUsd = 0;

  const categoryAggregation: Record<
    string,
    { original: number; dense: number; saved: number; usd: number; count: number }
  > = {
    ingest_bypass: { original: 0, dense: 0, saved: 0, usd: 0, count: 0 },
    reference_compression: { original: 0, dense: 0, saved: 0, usd: 0, count: 0 },
    brevity_transformation: { original: 0, dense: 0, saved: 0, usd: 0, count: 0 },
    command_minification: { original: 0, dense: 0, saved: 0, usd: 0, count: 0 },
    source_cache: { original: 0, dense: 0, saved: 0, usd: 0, count: 0 },
  };

  for (const tx of transactions) {
    totalSavedTokens += tx.savedTokens;
    totalOriginalTokens += tx.originalTokens;
    totalSavedUsd += tx.savedUsd;

    const cat = categoryAggregation[tx.category] || { original: 0, dense: 0, saved: 0, usd: 0, count: 0 };
    cat.original += tx.originalTokens;
    cat.dense += tx.denseTokens;
    cat.saved += tx.savedTokens;
    cat.usd += tx.savedUsd;
    cat.count += 1;
    categoryAggregation[tx.category] = cat;
  }

  const overallReduction = totalOriginalTokens > 0
    ? ((totalSavedTokens / totalOriginalTokens) * 100).toFixed(1)
    : "0.0";

  const lines: string[] = [];
  lines.push(`\n  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}`);
  lines.push(`  ${STYLE.bold}📈 Project Cortex — Token & Cost Savings Ledger & Analytics${STYLE.reset}`);
  lines.push(`  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}`);

  // Summary Grid
  lines.push(`  ${STYLE.bold}Summary Metrics:${STYLE.reset}`);
  lines.push(`  ├─ Total Tokens Saved     : ${STYLE.green}${totalSavedTokens.toLocaleString()}${STYLE.reset}`);
  lines.push(`  ├─ Total Estimated ROI   : ${STYLE.bold}${STYLE.green}$${totalSavedUsd.toFixed(4)}${STYLE.reset}`);
  lines.push(`  └─ Overall Savings Ratio  : ${STYLE.bold}${STYLE.cyan}${overallReduction}% Reduction${STYLE.reset}`);
  lines.push(`  ${STYLE.gray}────────────────────────────────────────────────────────────────────────${STYLE.reset}`);

  // Detailed Category Breakdown Table
  lines.push(`  ${STYLE.bold}Category Breakdown:${STYLE.reset}`);
  lines.push(`  ${STYLE.gray}┌────────────────────────┬───────────┬─────────────────┬─────────────────┐${STYLE.reset}`);
  lines.push(`  ${STYLE.gray}│${STYLE.reset} ${STYLE.bold}Savings Category${STYLE.reset.padEnd(31)} ${STYLE.gray}│${STYLE.reset} ${STYLE.bold}Count${STYLE.reset.padEnd(14)} ${STYLE.gray}│${STYLE.reset} ${STYLE.bold}Tokens Saved${STYLE.reset.padEnd(20)} ${STYLE.gray}│${STYLE.reset} ${STYLE.bold}USD Saved${STYLE.reset.padEnd(19)} ${STYLE.gray}│${STYLE.reset}`);
  lines.push(`  ${STYLE.gray}├────────────────────────┼───────────┼─────────────────┼─────────────────┤${STYLE.reset}`);

  const friendlyNames: Record<string, string> = {
    ingest_bypass: "Ingest Diff Bypasses",
    reference_compression: "MCP Reference Hashing",
    brevity_transformation: "Brevity Response Minification",
    command_minification: "Command Log Minification",
    source_cache: "AST Skeleton Cache",
  };

  for (const [key, data] of Object.entries(categoryAggregation)) {
    if (data.count === 0) continue;
    const catName = friendlyNames[key] || key;
    lines.push(
      `  ${STYLE.gray}│${STYLE.reset} ${catName.padEnd(22)} ` +
      `${STYLE.gray}│${STYLE.reset} ${data.count.toString().padEnd(9)} ` +
      `${STYLE.gray}│${STYLE.reset} ${data.saved.toLocaleString().padStart(15)} ` +
      `${STYLE.gray}│${STYLE.reset} $${data.usd.toFixed(4).padStart(14)} ` +
      `${STYLE.gray}│${STYLE.reset}`
    );
  }
  lines.push(`  ${STYLE.gray}└────────────────────────┴───────────┴─────────────────┴─────────────────┘${STYLE.reset}`);

  // File-Level Bypass Savings Log
  const fileBypasses = transactions.filter(tx => tx.category === "ingest_bypass" && tx.details);
  if (fileBypasses.length > 0) {
    lines.push(`  ${STYLE.gray}────────────────────────────────────────────────────────────────────────${STYLE.reset}`);
    lines.push(`  ${STYLE.bold}File-Level Token Savings Details:${STYLE.reset}`);
    const recent = fileBypasses.slice(-5);
    recent.forEach((tx, idx) => {
      const isLast = idx === recent.length - 1;
      const prefix = isLast ? "  └─ " : "  ├─ ";
      const dateStr = tx.timestamp.split("T")[0];
      lines.push(`  ${prefix}[${dateStr}] Saved ${STYLE.green}${tx.savedTokens.toLocaleString()} tokens${STYLE.reset} (${STYLE.cyan}${tx.details}${STYLE.reset})`);
    });
  }

  lines.push(`  ${STYLE.gray}────────────────────────────────────────────────────────────────────────${STYLE.reset}`);
  lines.push(`  ${STYLE.gray}*Pro-tip: Run \`cortex savings --graph\` to view your rolling 30-day chronological chart!*`);
  lines.push(`  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}\n`);

  return lines.join("\n");
}

function renderSavingsGraphString(transactions: SavingsTransaction[]): string {
  // Filter and aggregate savings over the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 29);
  
  // Normalize timestamp helper
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Initialize rolling 30 days dictionary with 0
  const dailyTotals: Record<string, { tokens: number; usd: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyTotals[formatDate(d)] = { tokens: 0, usd: 0 };
  }

  // Aggregate ledger transactions into active rolling timeline
  for (const tx of transactions) {
    const txDate = tx.timestamp.split("T")[0];
    if (dailyTotals[txDate] !== undefined) {
      dailyTotals[txDate].tokens += tx.savedTokens;
      dailyTotals[txDate].usd += tx.savedUsd;
    }
  }

  const sortedDates = Object.keys(dailyTotals).sort();
  const maxUsd = Math.max(...sortedDates.map((d) => dailyTotals[d].usd));
  
  const lines: string[] = [];
  lines.push(`\n  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}`);
  lines.push(`  ${STYLE.bold}🔮 rolling 30-Day Chronological Cost Savings Trend ($ Saved)${STYLE.reset}`);
  lines.push(`  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}`);

  if (maxUsd === 0) {
    lines.push(`\n  ${STYLE.yellow}💡 All ledger savings are $0.00 in the rolling 30-day window.${STYLE.reset}\n`);
    return lines.join("\n");
  }

  const height = 10;
  const grid: string[][] = Array.from({ length: height }, () => Array(30).fill(" "));

  for (let col = 0; col < 30; col++) {
    const date = sortedDates[col];
    const val = dailyTotals[date].usd;
    const filledBlocks = Math.round((val / maxUsd) * height);
    
    for (let row = 0; row < height; row++) {
      if (row < filledBlocks) {
        // Draw solid bar characters from bottom to top
        grid[height - 1 - row][col] = "█";
      }
    }
  }

  // Draw the Y-axis and graph
  for (let r = 0; r < height; r++) {
    const levelVal = maxUsd * ((height - r) / height);
    const label = `$${levelVal.toFixed(2)}`.padStart(8);
    lines.push(`  ${STYLE.bold}${STYLE.cyan}${label} │${STYLE.reset} ${grid[r].map((char) => (char === "█" ? STYLE.green + char + STYLE.reset : char)).join("  ")}`);
  }

  // Draw X-axis
  lines.push(`  ${STYLE.bold}${STYLE.cyan}  $0.00 ┼${"".padEnd(90, "─")}${STYLE.reset}`);
  
  // Date ticks (e.g. print start date, mid date, end date)
  const startDateTick = sortedDates[0].substring(5);
  const midDateTick = sortedDates[14].substring(5);
  const endDateTick = sortedDates[29].substring(5);

  const tickLine = `            ${startDateTick}${"".padEnd(36)}${midDateTick}${"".padEnd(37)}${endDateTick}`;
  lines.push(`  ${STYLE.gray}${tickLine}${STYLE.reset}`);
  lines.push(`  ${STYLE.bold}${STYLE.cyan}========================================================================${STYLE.reset}\n`);

  return lines.join("\n");
}
