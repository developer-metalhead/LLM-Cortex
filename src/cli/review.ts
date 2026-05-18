// Phase 7.5 — Human Review Workflow (lightweight stub for Phase 23 expansion)
//
// Sets / clears the `human_reviewed` + `reviewed_by` fields on an entity so
// the Phase 7.5 quality score reflects human sign-off. Phase 23 will expand
// this into a full review queue with edit / reject / skip semantics; for now
// the stub is enough to make the quality dimension functional.
//
// Returns shell exit codes: 0 on success, 1 on entity-not-found.

import { KnowledgeManager } from "../knowledge/writer.js";

export async function runReviewAccept(
  projectRoot: string,
  entityName: string,
  reviewer?: string,
): Promise<number> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 1;
  }

  const result = await km.setHumanReview(entityName, true, reviewer);
  if (!result.ok) {
    console.error(`❌ ${result.reason}`);
    return 1;
  }

  const tag = reviewer ? ` (reviewer: ${reviewer})` : "";
  console.log(`✅ Marked '${entityName}' as human-reviewed${tag}.`);
  console.log(`   Quality score will reflect the change immediately.`);
  return 0;
}

export async function runReviewReject(
  projectRoot: string,
  entityName: string,
): Promise<number> {
  const km = new KnowledgeManager(projectRoot);
  if (!(await km.exists())) {
    console.log("Knowledge base not initialized. Run `cortex init` first.");
    return 1;
  }

  const result = await km.setHumanReview(entityName, false);
  if (!result.ok) {
    console.error(`❌ ${result.reason}`);
    return 1;
  }

  console.log(`✅ Cleared human-review flag on '${entityName}'.`);
  console.log(`   Entity returns to unreviewed status; full review workflow ships in Phase 23.`);
  return 0;
}
