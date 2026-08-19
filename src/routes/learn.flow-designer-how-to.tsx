import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/learn/flow-designer-how-to")({
  component: () => <Outlet />,
});
