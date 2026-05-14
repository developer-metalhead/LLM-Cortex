import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { LIBRARIAN_SYSTEM_PROMPT, EXTRACTION_PROMPT_TEMPLATE } from './prompts.js';
import dotenv from 'dotenv';
import { SynthesisSchema, type Synthesis } from './schema.js';

export { SynthesisSchema, type Synthesis } from './schema.js';

dotenv.config({ quiet: true } as any);

export async function synthesizeChanges(diff: string, context: string): Promise<Synthesis | null> {
  // --- MOCK ENGINE (FOR TESTING ONLY) ---
  if (process.env.CORTEX_MOCK_AI === 'true') {
    console.error('Testing [MOCK MODE] Simulating LLM Synthesis...');
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
    console.error('OPENAI_API_KEY is not set. Skipping synthesis.');
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
    console.error('Synthesis Error:', error);
    return null;
  }
}
