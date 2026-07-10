import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProgressTool from "./tools/get-my-progress";
import saveMyProgressTool from "./tools/save-my-progress";
import listMyFeedbackTool from "./tools/list-my-feedback";
import submitFeedbackTool from "./tools/submit-feedback";
import listTracksTool from "./tools/list-tracks";
import listPracticeQuestionsTool from "./tools/list-practice-questions";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud
// proxy that publish rewrites SUPABASE_URL to. VITE_SUPABASE_PROJECT_ID is
// inlined by Vite at build time and survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sparkcoder-mcp",
  title: "SparkCoder",
  version: "0.1.0",
  instructions:
    "Tools for SparkCoder, a ServiceNow interview-prep learning app. " +
    "Use `list_tracks` and `list_practice_questions` to browse public content, " +
    "`get_my_progress` / `save_my_progress` to read or update the signed-in user's XP and streaks, " +
    "`submit_feedback` and `list_my_feedback` for the user's issue reports.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTracksTool,
    listPracticeQuestionsTool,
    getMyProgressTool,
    saveMyProgressTool,
    listMyFeedbackTool,
    submitFeedbackTool,
  ],
});
