import { createFileRoute } from "@tanstack/react-router";
import { InterviewGuide, interviewGuideHead } from "@/components/InterviewGuide";
import { INTEGRATION_GUIDE } from "@/lib/content/interview-guides";

export const Route = createFileRoute("/learn/integration-interview-questions")({
  head: () => interviewGuideHead(INTEGRATION_GUIDE),
  component: IntegrationGuide,
});

function IntegrationGuide() {
  return <InterviewGuide guide={INTEGRATION_GUIDE} />;
}