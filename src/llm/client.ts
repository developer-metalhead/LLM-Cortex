import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { LIBRARIAN_SYSTEM_PROMPT, EXTRACTION_PROMPT_TEMPLATE } from "./prompts.js";
import { SynthesisSchema, type Synthesis } from "./schema.js";

export { SynthesisSchema, type Synthesis } from "./schema.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Provider = 'openai' | 'anthropic' | 'google' | 'local';

const PROVIDER_DEFAULTS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-1.5-pro',
  local: 'gpt-4o',
};

function resolveModel() {
  const provider = (process.env.CORTEX_PROVIDER || 'openai').toLowerCase() as Provider;
  const model = process.env.CORTEX_MODEL || PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openai;

  switch (provider) {
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY is not set. Skipping synthesis.');
        return null;
      }
      return anthropic(model);

    case 'google':
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error('GOOGLE_GENERATIVE_AI_API_KEY is not set. Skipping synthesis.');
        return null;
      }
      return google(model);

    case 'local': {
      const baseUrl = process.env.LOCAL_BASE_URL;
      if (!baseUrl) {
        console.error('LOCAL_BASE_URL is not set. Skipping synthesis.');
        return null;
      }
      const localProvider = createOpenAICompatible({ name: 'local', baseURL: baseUrl });
      return localProvider(model);
    }

    case 'openai':
    default:
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set. Skipping synthesis.');
        return null;
      }
      return openai(model);
  }
}

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
          relationships: [{ target: "CortexLogic", kind: "depends_on" }]
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

  const model = resolveModel();
  if (!model) return null;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        output: "object",
        schema: SynthesisSchema,
        system: LIBRARIAN_SYSTEM_PROMPT,
        prompt: EXTRACTION_PROMPT_TEMPLATE(diff, context),
      });
      return object;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("Synthesis Error:", error);
        return null;
      }
      await sleep(1000 * attempt);
    }
  }
  return null;
}
