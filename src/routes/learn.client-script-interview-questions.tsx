import { createFileRoute } from "@tanstack/react-router";
import { InterviewGuide, interviewGuideHead } from "@/components/InterviewGuide";
import { CLIENT_SCRIPT_GUIDE } from "@/lib/content/interview-guides";

export const Route = createFileRoute("/learn/client-script-interview-questions")({
  head: () => interviewGuideHead(CLIENT_SCRIPT_GUIDE),
  component: ClientScriptGuide,
});

function ClientScriptGuide() {
  return <InterviewGuide guide={CLIENT_SCRIPT_GUIDE} />;
}