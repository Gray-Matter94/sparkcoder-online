import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface Alternative {
  title: string;
  rationale: string;
  code: string;
}

const InputSchema = z.object({
  questionId: z.string().min(1),
  side: z.enum(["server", "client"]),
  scriptType: z.string(),
  title: z.string(),
  task: z.string(),
  referenceSolution: z.string(),
});

const SYSTEM = `You are a senior ServiceNow developer coaching an interview candidate.
For the given task and reference solution, propose 2-3 DIFFERENT valid approaches
that would produce the same correct result. Vary the APIs / patterns —
e.g. addEncodedQuery vs chained addQuery, GlideAggregate vs while-loop counting,
GlideRecordSecure vs GlideRecord, Script Include vs inline, arrow-function style,
UI Policy vs Client Script, GlideAjax vs g_scratchpad, etc.
Return STRICT JSON matching the tool schema. Each "code" MUST be a complete,
runnable ServiceNow script (no ellipses, no commentary inside code).`;

export const suggestAlternatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ alternatives: Alternative[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI is not configured on this environment.");
    }

    const userPrompt = `TASK (${data.side} · ${data.scriptType}): ${data.title}
${data.task}

Reference solution (one valid answer — do NOT repeat this one):
\`\`\`javascript
${data.referenceSolution}
\`\`\`

Return 2-3 distinct alternative solutions. Each should use a materially
different API or pattern than the reference and be a complete script.`;

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
              name: "return_alternatives",
              description: "Return alternative valid ServiceNow scripts.",
              parameters: {
                type: "object",
                properties: {
                  alternatives: {
                    type: "array",
                    minItems: 2,
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        rationale: { type: "string" },
                        code: { type: "string" },
                      },
                      required: ["title", "rationale", "code"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["alternatives"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_alternatives" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("AI rate limit reached — please try again in a moment.");
      }
      if (res.status === 402) {
        throw new Error("AI credits exhausted for this workspace.");
      }
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
    let parsed: { alternatives: Alternative[] } | null = null;
    if (toolArgs) {
      try {
        parsed = JSON.parse(toolArgs);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed?.alternatives?.length) {
      throw new Error("AI returned no alternatives. Try again.");
    }
    return { alternatives: parsed.alternatives.slice(0, 3) };
  });
