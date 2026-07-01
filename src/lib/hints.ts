import type { Question } from "./questions";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; blurb: string }[] = [
  { id: "easy", label: "Easy", emoji: "🟢", blurb: "Warm-up puzzles · big hints" },
  { id: "medium", label: "Medium", emoji: "🟡", blurb: "Interview core · conceptual hints" },
  { id: "hard", label: "Hard", emoji: "🔴", blurb: "Senior traps · subtle nudges only" },
];

/** Map a question level onto a difficulty bucket. */
export function levelDifficulty(level: number): Difficulty {
  if (level <= 1) return "easy";
  if (level === 2) return "medium";
  return "hard";
}

export function matchesDifficulty(level: number, difficulty: Difficulty): boolean {
  return levelDifficulty(level) === difficulty;
}

function firstSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : trimmed.slice(0, 140);
}

/** Produce a hint tuned to the selected difficulty. */
export function getHintForQuestion(q: Question, difficulty: Difficulty): string {
  const correct = q.options.find((o) => o.correct);
  const concept = firstSentence(q.correctTeach.explain || q.correctTeach.title);

  if (difficulty === "easy" && correct) {
    // Reveal a strong shape hint: first meaningful token of the correct answer.
    const token = correct.text.trim().split(/[\s(]/)[0];
    return `Start with \`${token}\` — ${concept}`;
  }

  if (difficulty === "medium") {
    return concept;
  }

  // Hard: no concept spoiler; nudge toward the category concern.
  return `Think about how ${q.category.replace(/-/g, " ")} handles this edge case. Re-read the code line by line before guessing.`;
}
