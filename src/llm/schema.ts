import { z } from "zod";

export const SynthesisSchema = z.object({
  summary: z.string(),
  entities: z.array(z.object({
    name: z.string(),
    action: z.enum(["create", "update", "delete"]),
    description: z.string(),
    links: z.array(z.string()),
    sourceFile: z.string().optional(),
  })),
  concepts: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  warnings: z.array(z.string()),
});

export type Synthesis = z.infer<typeof SynthesisSchema>;
