import { LevelThreshold } from "./types";

export const LEVELS: LevelThreshold[] = [
  { level: 1,  xpRequired: 0,     title: "Bronze I",    emoji: "🥉" },
  { level: 2,  xpRequired: 50,    title: "Bronze II",   emoji: "🥉" },
  { level: 3,  xpRequired: 120,   title: "Bronze III",  emoji: "🥉" },
  { level: 4,  xpRequired: 220,   title: "Bronze IV",   emoji: "🥉" },
  { level: 5,  xpRequired: 350,   title: "Silver I",    emoji: "🥈" },
  { level: 6,  xpRequired: 520,   title: "Silver II",   emoji: "🥈" },
  { level: 7,  xpRequired: 730,   title: "Silver III",  emoji: "🥈" },
  { level: 8,  xpRequired: 1000,  title: "Silver IV",   emoji: "🥈" },
  { level: 9,  xpRequired: 1350,  title: "Gold I",      emoji: "🥇" },
  { level: 10, xpRequired: 1750,  title: "Gold II",     emoji: "🥇" },
  { level: 11, xpRequired: 2250,  title: "Gold III",    emoji: "🥇" },
  { level: 12, xpRequired: 2850,  title: "Gold IV",     emoji: "🥇" },
  { level: 13, xpRequired: 3600,  title: "Platinum I",  emoji: "💎" },
  { level: 14, xpRequired: 4500,  title: "Platinum II", emoji: "💎" },
  { level: 15, xpRequired: 5600,  title: "Platinum III", emoji: "💎" },
  { level: 16, xpRequired: 6900,  title: "Platinum IV", emoji: "💎" },
  { level: 17, xpRequired: 8500,  title: "Diamond I",   emoji: "👑" },
  { level: 18, xpRequired: 10400, title: "Diamond II",  emoji: "👑" },
  { level: 19, xpRequired: 12800, title: "Diamond III", emoji: "👑" },
  { level: 20, xpRequired: 15000, title: "Diamond IV",  emoji: "👑" },
];

export function getLevelForXP(xp: number): LevelThreshold {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXPToNextLevel(xp: number): { current: number; next: number; progress: number } {
  const lvl = getLevelForXP(xp);
  const nextIdx = LEVELS.findIndex((l) => l.level === lvl.level) + 1;
  if (nextIdx >= LEVELS.length) return { current: xp, next: xp, progress: 1 };
  const next = LEVELS[nextIdx].xpRequired;
  const base = lvl.xpRequired;
  return { current: xp - base, next: next - base, progress: (xp - base) / (next - base) };
}
