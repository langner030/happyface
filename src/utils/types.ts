export interface ExpressionSnapshot {
  timestamp: number;
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
  fearful: number;
  disgusted: number;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  snapshots: ExpressionSnapshot[];
  avgHappiness: number;
  peakHappiness: number;
  totalScans: number;
}

export interface StreakInfo {
  current: number;
  best: number;
  lastDate: string;
}

export type AppView = "live" | "timeline" | "stats";

export interface PremiumState {
  isPremium: boolean;
  /** Cumulative active usage in milliseconds */
  totalUsageMs: number;
  /** ISO date of first launch */
  firstLaunchDate: string;
  /** Whether the user has dismissed the 15-minute upgrade prompt */
  usagePromptDismissed: boolean;
  /** Whether the user has dismissed the 2-day upgrade prompt */
  dayPromptDismissed: boolean;
}

/** Free tier limits and upgrade funnel thresholds */
export const FREE_LIMITS = {
  maxDaysStored: 5,
  softUsagePromptMs: 15 * 60 * 1000,
  softDayPromptDays: 2,
  hardUsagePromptMs: 80 * 60 * 1000,
} as const;

// ── Gamification ──────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  title: string;
  emoji: string;
  category: "streak" | "scan" | "emotion" | "time" | "special";
}

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string;
  emoji: string;
}

export interface PersonalRecords {
  longestHappyStreak: number;   // consecutive scans >50% happy
  highestHappyScore: number;    // single scan peak
  totalHappyMinutes: number;    // cumulative minutes >50% happy
  longestSession: number;       // longest continuous session in minutes
}

export interface GamificationState {
  achievements: Record<string, number | null>; // id → unlockedAt timestamp
  xp: number;
  level: number;
  records: PersonalRecords;
  counters: {
    totalScans: number;
    totalUsageMinutes: number;
    happyScansAbove70: number;
    surprisedScansAbove50: number;
    neutralScansAbove50: number;
    nightScans: number;
    earlyScans: number;
    peakHappinessEver: number;
    consecutiveHappyScans: number;
    maxConsecutiveHappyScans: number;
  };
}

export interface ToastItem {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  type: "achievement" | "levelup" | "record" | "nudge";
}

export const NUDGES: { emoji: string; text: string; category: "low" | "medium" | "high" }[] = [
  // Low happiness
  { emoji: "😊", text: "Versuch mal bewusst zu lächeln!", category: "low" },
  { emoji: "🧘", text: "Steh auf, streck dich, atme tief.", category: "low" },
  { emoji: "💭", text: "Denk an was Schönes von letzter Woche.", category: "low" },
  { emoji: "💧", text: "Ein Glas Wasser wirkt Wunder.", category: "low" },
  { emoji: "💌", text: "Schreib jemandem was Nettes!", category: "low" },
  { emoji: "🎵", text: "Hör deinen Lieblingssong.", category: "low" },
  { emoji: "🌿", text: "Schau kurz aus dem Fenster.", category: "low" },
  { emoji: "😤", text: "3x tief ein- und ausatmen.", category: "low" },

  // Medium
  { emoji: "💪", text: "Du bist auf einem guten Weg!", category: "medium" },
  { emoji: "👀", text: "Kurz vom Bildschirm wegsehen.", category: "medium" },
  { emoji: "☕", text: "Zeit für einen kleinen Kaffee?", category: "medium" },
  { emoji: "🙌", text: "Gute Fokus-Energy gerade!", category: "medium" },
  { emoji: "🎯", text: "Bleib dran, du machst das gut.", category: "medium" },
  { emoji: "⏰", text: "Nächste Pause in 10 Minuten?", category: "medium" },

  // High happiness
  { emoji: "✨", text: "Du strahlst! Weiter so!", category: "high" },
  { emoji: "🔥", text: "Positive Energie ist ansteckend!", category: "high" },
  { emoji: "🚀", text: "Peak Performance! So macht's Spaß.", category: "high" },
  { emoji: "⭐", text: "Dein Lächeln rockt gerade.", category: "high" },
  { emoji: "🎉", text: "Happy Vibes! Keep going!", category: "high" },
  { emoji: "💎", text: "Beste Laune — das sieht man!", category: "high" },
];
