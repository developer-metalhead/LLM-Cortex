import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { LIBRARIAN_SYSTEM_PROMPT, EXTRACTION_PROMPT_TEMPLATE } from './prompts.js';
import dotenv from 'dotenv';

dotenv.config();

// Schema for the Librarian's synthesis output
export const SynthesisSchema = z.object({
  summary: z.string().describe('A brief (1-2 sentence) high-level summary of the change.'),
  entities: z.array(z.object({
    name: z.string().describe('Name of the file, class, or module.'),
    action: z.enum(['create', 'update', 'delete']),
    description: z.string().describe('What changed in this specific entity.'),
    links: z.array(z.string()).describe('Bidirectional links to other entities or concepts.')
  })).describe('Specific codebase components that were modified.'),
  concepts: z.array(z.object({
    name: z.string().describe('The name of the architectural concept (e.g., AuthStrategy).'),
    description: z.string().describe('Definition or update of the abstract concept.'),
  })).describe('Abstract architectural patterns or business logic ideas.'),
  warnings: z.array(z.string()).describe('Potential contradictions, technical debt, or architectural drift identified.')
});

export type Synthesis = z.infer<typeof SynthesisSchema>;

export async function synthesizeChanges(diff: string, context: string): Promise<Synthesis | null> {
  // --- MOCK ENGINE (FOR TESTING ONLY) ---
  if (process.env.CORTEX_MOCK_AI === 'true') {
    console.log('🧪 [MOCK MODE] Simulating LLM Synthesis...');
    return {
      summary: "Simulated summary of your project changes.",
      entities: [
        {
          name: "ProjectCore.ts",
          action: "update",
          description: "Simulated architectural update.",
          links: ["[[CortexLogic]]"]
        }
      ],
      concepts: [
        {
          name: "CortexLogic",
          description: "The core logic of the Cortex engine."
        }
      ],
      warnings: ["Mock Mode is active."]
    };
  }
  // ---------------------------------------

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY is not set. Skipping synthesis.');
    return null;
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'), // Or your preferred model
      schema: SynthesisSchema,
      system: LIBRARIAN_SYSTEM_PROMPT,
      prompt: EXTRACTION_PROMPT_TEMPLATE(diff, context),
    });

    return object;
  } catch (error) {
    console.error('❌ Synthesis Error:', error);
    return null;
  }
}
