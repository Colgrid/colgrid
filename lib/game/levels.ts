// XP values and level thresholds. Source: docs/game-design.md §9 and docs/mvp-spec.md.
// Levels are derived from total XP, which only goes up.

export const XP = {
  attend: 50,
  mainQuest: 25,
  hiddenQuest: 30,
  allMainQuestsBonus: 20,
} as const;

// Minimum total XP to reach each level. Index 0 = Level 1.
// L1-L5 come from the MVP spec; L6+ extend the same curve. Tune after Session 01.
export const LEVEL_THRESHOLDS: readonly number[] = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];

export type LevelProgress = {
  level: number;
  totalXp: number;
  levelStartXp: number;
  nextLevelXp: number | null; // null at the top level
  xpIntoLevel: number;
  xpToNext: number | null;
  progress: number; // 0..1 toward the next level (1 at the top level)
};

export function levelFor(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let index = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) index = i;
  }
  const levelStartXp = LEVEL_THRESHOLDS[index];
  const nextLevelXp = index + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[index + 1] : null;
  const xpIntoLevel = xp - levelStartXp;
  const xpToNext = nextLevelXp === null ? null : nextLevelXp - xp;
  const progress = nextLevelXp === null ? 1 : xpIntoLevel / (nextLevelXp - levelStartXp);
  return { level: index + 1, totalXp: xp, levelStartXp, nextLevelXp, xpIntoLevel, xpToNext, progress };
}

// "LVL 04"
export function formatLevel(level: number): string {
  return `LVL ${String(level).padStart(2, "0")}`;
}

// "Chapter 01", "Session 02"
export function formatNumber(n: number): string {
  return String(n).padStart(2, "0");
}
