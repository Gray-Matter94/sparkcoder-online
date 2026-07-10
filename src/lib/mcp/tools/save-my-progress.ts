import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "save_my_progress",
  title: "Save my progress",
  description:
    "Replace the signed-in SparkCoder user's saved progress blob. Pass the full progress object you want stored (XP, streaks, solved puzzles, etc.); it overwrites the previous value. Requires sign-in.",
  inputSchema: {
    data: z
      .record(z.unknown())
      .describe("The full progress object to persist for this user."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    const { data: row, error } = await supabase
      .from("user_progress")
      .upsert({ user_id: userId, data: data as never })
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: "Progress saved." }],
      structuredContent: { progress: row },
    };
  },
});
