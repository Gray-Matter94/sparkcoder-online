import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { QUESTIONS } from "@/lib/questions";

export default defineTool({
  name: "list_practice_questions",
  title: "List practice questions",
  description:
    "List SparkCoder practice questions. Optionally filter by category id (e.g. 'gliderecord', 'streams', 'grc-tables', 'ng-directives'). Returns id, category, prompt, and difficulty. Public — no auth required.",
  inputSchema: {
    category: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional()
      .describe("Optional category id to filter by. Omit for all categories."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Max questions to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, limit }) => {
    const cap = limit ?? 50;
    const filtered = (category
      ? QUESTIONS.filter((q) => q.category === category)
      : QUESTIONS
    )
      .slice(0, cap)
      .map((q) => ({
        id: q.id,
        category: q.category,
        title: q.title,
        level: q.level,
      }));
    return {
      content: [
        {
          type: "text",
          text:
            filtered.length === 0
              ? category
                ? `No questions found for category "${category}".`
                : "No questions found."
              : JSON.stringify(filtered, null, 2),
        },
      ],
      structuredContent: { questions: filtered, count: filtered.length },
    };
  },
});
