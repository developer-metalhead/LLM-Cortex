import { z } from "zod";

export const EvidenceSchema = z.object({
  sourceFile: z.string(),
  lineRange: z.tuple([z.number(), z.number()]).optional(),
  commit: z.string().optional(),
  content: z.string().max(500).optional(),
});

export const FailedApproachSchema = z.object({
  summary: z.string(),
  reason: z.string(),
  recordedAt: z.string(),
  commit: z.string().optional(),
});

export const RelationshipSchema = z.object({
  target: z.string(),
  kind: z.enum(["depends_on", "called_by", "supports", "contradicts", "derived_from", "parent_of"]),
});

export const ConstraintsSchema = z.object({
  mustNotImport: z.array(z.string()).optional(),
  mustNotBeCalledBy: z.array(z.string()).optional(),
  contract: z.string().optional(),
});

export const SynthesisSchema = z.object({
  summary: z.string(),
  entities: z.array(z.object({
    name: z.string(),
    action: z.enum(["create", "update", "delete"]),
    description: z.string(),
    relationships: z.array(RelationshipSchema),
    constraints: ConstraintsSchema.optional(),
    failedApproaches: z.array(FailedApproachSchema).max(10).optional(),
    sourceFile: z.string().optional(),
    evidence: z.array(EvidenceSchema).max(2).optional(),
  })),
  concepts: z.array(z.object({
    name: z.string(),
    description: z.string(),
    relationships: z.array(RelationshipSchema).optional(),
    failedApproaches: z.array(FailedApproachSchema).max(10).optional(),
  })),
  warnings: z.array(z.string()),
});

export const SaveConceptSchema = z.object({
  name: z.string(),
  description: z.string(),
  relationships: z.array(RelationshipSchema).optional(),
  failedApproaches: z.array(FailedApproachSchema).max(10).optional(),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;
export type SaveConcept = z.infer<typeof SaveConceptSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type FailedApproach = z.infer<typeof FailedApproachSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
