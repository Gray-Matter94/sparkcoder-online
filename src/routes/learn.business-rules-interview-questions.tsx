import { createFileRoute } from "@tanstack/react-router";
import { InterviewGuide, interviewGuideHead } from "@/components/InterviewGuide";
import { BUSINESS_RULES_GUIDE } from "@/lib/content/interview-guides";

export const Route = createFileRoute("/learn/business-rules-interview-questions")({
  head: () => interviewGuideHead(BUSINESS_RULES_GUIDE),
  component: BusinessRulesGuide,
});

function BusinessRulesGuide() {
  return <InterviewGuide guide={BUSINESS_RULES_GUIDE} />;
}