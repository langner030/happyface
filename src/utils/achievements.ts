import { AchievementDef, GamificationState } from "./types";
import { getAchievementTitle as getI18nAchievementTitle } from "../i18n";

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-scan",     emoji: "📸", title: "First Scan",        category: "scan" },
  { id: "century",         emoji: "💫", title: "Century",           category: "scan" },
  { id: "thousand",        emoji: "🏅", title: "Thousand Club",     category: "scan" },
  { id: "ten-thousand",    emoji: "👑", title: "Legend",            category: "scan" },
  { id: "first-smile",     emoji: "😊", title: "First Smile",       category: "emotion" },
  { id: "joy-master",      emoji: "🤩", title: "Joy Master",        category: "emotion" },
  { id: "steady-grin",     emoji: "😁", title: "Steady Grin",       category: "emotion" },
  { id: "hundred-percent", emoji: "💯", title: "Perfection",        category: "emotion" },
  { id: "poker-face",      emoji: "😐", title: "Poker Face",        category: "emotion" },
  { id: "plot-twist",      emoji: "😲", title: "Plot Twist",        category: "emotion" },
  { id: "week-warrior",    emoji: "🗓️", title: "Week Warrior",      category: "streak" },
  { id: "fortnight",       emoji: "⚔️", title: "Fortnight Fighter", category: "streak" },
  { id: "monthly",         emoji: "🌙", title: "Monthly Master",    category: "streak" },
  { id: "marathon",        emoji: "⏱️", title: "Marathon",          category: "time" },
  { id: "night-owl",       emoji: "🦉", title: "Night Owl",         category: "time" },
  { id: "early-bird",      emoji: "🐦", title: "Early Bird",        category: "time" },
  { id: "level-ten",       emoji: "🔟", title: "Double Digits",     category: "special" },
];

export function checkAchievement(
  id: string,
  state: GamificationState,
  streakCurrent: number,
): boolean {
  const c = state.counters;
  switch (id) {
    case "first-scan":      return c.totalScans >= 1;
    case "century":          return c.totalScans >= 100;
    case "thousand":         return c.totalScans >= 1000;
    case "ten-thousand":     return c.totalScans >= 10000;
    case "first-smile":      return c.happyScansAbove70 >= 1;
    case "joy-master":       return c.happyScansAbove70 >= 100;
    case "steady-grin":      return c.maxConsecutiveHappyScans >= 10;
    case "hundred-percent":  return c.peakHappinessEver >= 100;
    case "poker-face":       return c.neutralScansAbove50 >= 100;
    case "plot-twist":       return c.surprisedScansAbove50 >= 50;
    case "week-warrior":     return streakCurrent >= 7;
    case "fortnight":        return streakCurrent >= 14;
    case "monthly":          return streakCurrent >= 30;
    case "marathon":         return c.totalUsageMinutes >= 60;
    case "night-owl":        return c.nightScans >= 1;
    case "early-bird":       return c.earlyScans >= 1;
    case "level-ten":        return state.level >= 10;
    default: return false;
  }
}

export function getAchievementTitle(id: string) {
  return getI18nAchievementTitle(id);
}
