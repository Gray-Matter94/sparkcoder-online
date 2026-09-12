import { Link } from "@tanstack/react-router";

export function EditorialNote({ updated }: { updated: string }) {
  return (
    <aside className="border-l-2 border-accent pl-3 text-[11px] leading-relaxed text-muted-foreground">
      Reviewed by the{" "}
      <Link to="/about" className="text-accent underline underline-offset-2">
        SparkCoder Editorial Team
      </Link>
      {" · "}Updated {updated}. Technical details are checked against primary platform
      documentation and revised when the content changes.
    </aside>
  );
}