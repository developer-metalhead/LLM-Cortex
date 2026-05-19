import { KnowledgeManager } from "../knowledge/writer.js";
import { OnboardingManager } from "../knowledge/onboarding.js";

export async function runOnboard(
  projectRoot: string,
  options: { audience?: "junior" | "senior" | "domain-expert"; depth?: "quick" | "thorough" }
): Promise<void> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.log("\n  Knowledge base not initialized. Run `cortex init` first.\n");
    return;
  }

  const audience = options.audience || "junior";
  const depth = options.depth || "quick";

  console.log(`\n  🎓 Building guided onboarding tour for target: ${audience.toUpperCase()} (${depth.toUpperCase()})...`);

  const om = new OnboardingManager(km);
  const guide = await om.generateOnboarding({ audience, depth });

  console.log("\n  ✨ Success! Personalized Onboarding Guide compiled.");
  console.log("  📂 Saved to: .knowledge/onboarding.md\n");

  // Output first section as summary
  const lines = guide.split("\n");
  const planMapIndex = lines.findIndex(l => l.includes("## 🗺️ Reading Plan Map"));
  if (planMapIndex !== -1) {
    const tourIndex = lines.findIndex(l => l.includes("## 🚀 Guided Architectural Tour"));
    const end = tourIndex !== -1 ? tourIndex : planMapIndex + 15;
    console.log(lines.slice(0, end).join("\n"));
  } else {
    console.log(guide.slice(0, 500) + "\n...\n");
  }
}
