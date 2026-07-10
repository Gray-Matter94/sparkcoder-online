import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "submit_feedback",
  title: "Submit feedback",
  description:
    "Create a new SparkCoder feedback / issue report for the signed-in user. Screenshots aren't supported through MCP — attach them from the /feedback page in the app. Requires sign-in.",
  inputSchema: {
    title: z.string().trim().min(3).max(120).describe("Short title for the issue."),
    description: z
      .string()
      .trim()
      .min(10)
      .max(2000)
      .describe("Detailed description of the issue or feedback."),
    page_url: z
      .string()
      .url()
      .optional()
      .describe("Optional URL of the page the feedback is about."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, description, page_url }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: userId,
        title,
        description,
        page_url: page_url ?? null,
      })
      .select("id, title, status, created_at")
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Feedback submitted (id ${data.id}).` }],
      structuredContent: { feedback: data },
    };
  },
});
