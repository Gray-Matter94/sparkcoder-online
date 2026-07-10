import { defineTool } from "@lovable.dev/mcp-js";
import { TRACKS } from "@/lib/tracks";

export default defineTool({
  name: "list_tracks",
  title: "List learning tracks",
  description:
    "List all SparkCoder learning tracks (ServiceNow Dev, Admin, IRM, Java, AngularJS) with their IDs, titles, and short descriptions. Public — no auth required.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = TRACKS.map((t) => ({
      id: t.id,
      title: t.title,
      tagline: t.tagline,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { tracks: items },
    };
  },
});
