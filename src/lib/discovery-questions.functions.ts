import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DISCOVERY_SECTIONS } from "./discovery-interview";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface GeneratedDefinitive {
  question: string;
  answer: string;
  alternate?: string;
}

export interface GeneratedScenario {
  title: string;
  scenario: string;
  approach: string[];
  code?: string;
  alternate: string;
  pitfall: string;
}

export interface GenerateResult {
  definitive: GeneratedDefinitive[];
  scenario: GeneratedScenario[];
}

const InputSchema = z.object({
  sectionSlug: z.string().min(1),
  existingTitles: z.array(z.string()).max(500).default([]),
  definitiveCount: z.number().int().min(1).max(10).default(6),
  scenarioCount: z.number().int().min(1).max(6).default(4),
});

const SYSTEM = `You are a senior ServiceNow architect writing interview prep.
Generate concise, ACCURATE, non-duplicate ServiceNow questions with model answers.
Use real ServiceNow tables, APIs, and terminology. Avoid marketing fluff.
Every scenario must include a realistic alternate approach and a pitfall.
Return STRICT JSON matching the tool schema — no prose outside the tool call.`;

export const generateDiscoveryQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<GenerateResult> => {
    const section = DISCOVERY_SECTIONS.find((s) => s.slug === data.sectionSlug);
    if (!section) throw new Error(`Unknown section: ${data.sectionSlug}`);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured on this environment.");

    const avoid = data.existingTitles.slice(-120).join("\n - ");
    const userPrompt = `SECTION: ${section.title}
SCOPE: ${section.scope}

Generate:
- ${data.definitiveCount} DEFINITIVE questions (what is X / how does Y work) with a 2-4 sentence model answer. Include an "alternate" phrasing/framing when useful.
- ${data.scenarioCount} SCENARIO questions (realistic on-the-job situations). Each needs: title, scenario paragraph, 3-5 approach bullets, an optional short code snippet (ServiceNow JS or config), an "alternate" approach paragraph, and a "pitfall" sentence.

DO NOT repeat or paraphrase any of these existing question titles:
 - ${avoid || "(none)"}

Cover DIFFERENT sub-topics within the scope. Every question must be uniquely valuable.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_questions",
              description: "Return generated interview questions.",
              parameters: {
                type: "object",
                properties: {
                  definitive: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                        alternate: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                  },
                  scenario: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        scenario: { type: "string" },
                        approach: { type: "array", items: { type: "string" } },
                        code: { type: "string" },
                        alternate: { type: "string" },
                        pitfall: { type: "string" },
                      },
                      required: ["title", "scenario", "approach", "alternate", "pitfall"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["definitive", "scenario"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_questions" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("AI rate limit reached — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
          content?: string;
        };
      }>;
    };

    const toolArgs = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: GenerateResult | null = null;
    if (toolArgs) {
      try {
        parsed = JSON.parse(toolArgs) as GenerateResult;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]) as GenerateResult;
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || (!parsed.definitive?.length && !parsed.scenario?.length)) {
      throw new Error("AI returned no questions. Try again.");
    }

    return {
      definitive: (parsed.definitive ?? []).slice(0, data.definitiveCount),
      scenario: (parsed.scenario ?? []).slice(0, data.scenarioCount),
    };
  });
