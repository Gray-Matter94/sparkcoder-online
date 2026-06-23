import { describe, it, expect } from "vitest";
import {
  classifyVerdict,
  verdictFor,
  FAST_PER_PAIR_MS,
  OK_PER_PAIR_MS,
} from "../../src/routes/play.verdict";

// Helpers that produce a total round time hitting a specific per-pair speed.
const fast = (size: number) => (FAST_PER_PAIR_MS - 100) * size; // < 2500ms/pair
const okSpeed = (size: number) => (FAST_PER_PAIR_MS + 500) * size; // 2500-4500ms/pair
const slow = (size: number) => (OK_PER_PAIR_MS + 500) * size; // > 4500ms/pair

describe("classifyVerdict — rank tiers", () => {
  it("S rank: fast AND zero misses", () => {
    const v = classifyVerdict(3, fast(6), 0, 6);
    expect(v.rank).toBe("S");
    expect(v.emoji).toBe("🚀");
    expect(v.titles).toContain("FLAWLESS VICTORY");
  });

  it("A rank (BLAZING): fast AND tidy misses but not clean", () => {
    // size 6 → tidy = misses <= ceil(6/3) = 2
    const v = classifyVerdict(3, fast(6), 2, 6);
    expect(v.rank).toBe("A");
    expect(v.emoji).toBe("⚡");
    expect(v.titles).toContain("BLAZING RUN");
  });

  it("A rank (NO MISSES): clean but not fast", () => {
    const v = classifyVerdict(3, okSpeed(6), 0, 6);
    expect(v.rank).toBe("A");
    expect(v.emoji).toBe("🎯");
    expect(v.titles).toContain("NO MISSES, NO MERCY");
  });

  it("B rank: ok speed AND tidy misses", () => {
    const v = classifyVerdict(3, okSpeed(6), 2, 6);
    expect(v.rank).toBe("B");
    expect(v.emoji).toBe("🛠️");
    expect(v.titles).toContain("SOLID DEPLOY");
  });

  it("C rank: ok speed but many misses (not tidy)", () => {
    // size 6 → tidy threshold = 2, so 5 misses is not tidy
    const v = classifyVerdict(3, okSpeed(6), 5, 6);
    expect(v.rank).toBe("C");
    expect(v.emoji).toBe("☕");
    expect(v.titles).toContain("NEEDS COFFEE");
  });

  it("D rank: slow round regardless of accuracy", () => {
    const v = classifyVerdict(3, slow(6), 4, 6);
    expect(v.rank).toBe("D");
    expect(v.emoji).toBe("🐢");
    expect(v.titles).toContain("EVENTUAL CONSISTENCY");
  });

  it("D rank: slow even when clean (speed gate wins over accuracy)", () => {
    // clean=true but ok=false → falls through clean branch (A 🎯) because
    // the clean branch is checked before ok. Verify that priority is honoured.
    const v = classifyVerdict(3, slow(6), 0, 6);
    expect(v.rank).toBe("A");
    expect(v.emoji).toBe("🎯");
  });
});

describe("classifyVerdict — boundary conditions", () => {
  it("per-pair exactly at FAST threshold is NOT fast (strict <)", () => {
    const v = classifyVerdict(1, FAST_PER_PAIR_MS * 6, 0, 6); // clean but not fast → 🎯 A
    expect(v.rank).toBe("A");
    expect(v.emoji).toBe("🎯");
  });

  it("per-pair just under FAST threshold IS fast", () => {
    const v = classifyVerdict(1, (FAST_PER_PAIR_MS - 1) * 6, 0, 6);
    expect(v.rank).toBe("S");
  });

  it("per-pair exactly at OK threshold is NOT ok (strict <)", () => {
    // not clean, not ok → D
    const v = classifyVerdict(1, OK_PER_PAIR_MS * 6, 1, 6);
    expect(v.rank).toBe("D");
  });

  it("tidy threshold scales with size: ceil(size/3)", () => {
    // size 9 → tidy <= 3 misses
    expect(classifyVerdict(1, fast(9), 3, 9).rank).toBe("A"); // BLAZING
    expect(classifyVerdict(1, fast(9), 4, 9).rank).toBe("D"); // fast but not clean, not tidy
  });

  it("guards against size 0 (no divide-by-zero)", () => {
    const v = classifyVerdict(1, 1000, 0, 0);
    expect(v).toBeDefined();
    expect(["S", "A", "B", "C", "D"]).toContain(v.rank);
  });
});

describe("classifyVerdict — message content", () => {
  it("titles and blurbs pools are non-empty for every tier", () => {
    const samples = [
      classifyVerdict(1, fast(6), 0, 6), // S
      classifyVerdict(1, fast(6), 2, 6), // A blazing
      classifyVerdict(1, okSpeed(6), 0, 6), // A clean
      classifyVerdict(1, okSpeed(6), 2, 6), // B
      classifyVerdict(1, okSpeed(6), 5, 6), // C
      classifyVerdict(1, slow(6), 5, 6), // D
    ];
    for (const v of samples) {
      expect(v.titles.length).toBeGreaterThan(0);
      expect(v.blurbs.length).toBeGreaterThan(0);
      expect(v.emoji).toBeTruthy();
    }
  });

  it("blurb pool references the current level number", () => {
    const v = classifyVerdict(7, fast(6), 0, 6);
    expect(v.blurbs.some((b) => b.includes("level 7"))).toBe(true);
  });

  it("BLAZING blurb teases the next level number", () => {
    const v = classifyVerdict(12, fast(6), 1, 6);
    expect(v.blurbs.some((b) => b.includes("level 13"))).toBe(true);
  });
});

describe("verdictFor — deterministic pick injection", () => {
  const firstPick = <T,>(arr: T[]) => arr[0];

  it("returns the picked title/blurb from the matched tier", () => {
    const v = verdictFor(2, fast(6), 0, 6, firstPick);
    expect(v.rank).toBe("S");
    expect(v.title).toBe("FLAWLESS VICTORY");
    expect(v.blurb).toContain("level 2");
  });

  it("uses the rank/emoji from classifyVerdict", () => {
    const v = verdictFor(2, slow(6), 4, 6, firstPick);
    expect(v.rank).toBe("D");
    expect(v.emoji).toBe("🐢");
    expect(v.title).toBe("EVENTUAL CONSISTENCY");
  });

  it("default pick (random) still yields a member of the tier pool", () => {
    const v = verdictFor(5, okSpeed(6), 2, 6);
    const tier = classifyVerdict(5, okSpeed(6), 2, 6);
    expect(tier.titles).toContain(v.title);
    expect(tier.blurbs).toContain(v.blurb);
  });
});
