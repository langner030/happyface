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
  /** Whether the user has dismissed the hours-based prompt */
  hoursDismissed: boolean;
  /** Whether the user has dismissed the week-based prompt */
  weekDismissed: boolean;
}

/** Free tier: max 5 days stored, prompt after 3h usage, hard prompt after 7d */
export const FREE_LIMITS = {
  maxDaysStored: 5,
  usagePromptMs: 3 * 60 * 60 * 1000,  // 3 hours
  weekPromptDays: 7,
} as const;

export const NUDGES: Record<string, string[]> = {
  low: [
    "Versuch mal bewusst zu lächeln — dein Gehirn folgt deinem Gesicht! 😊",
    "Kurze Pause? Steh auf, streck dich, atme tief durch.",
    "Denk an etwas, das dich letzte Woche zum Lachen gebracht hat.",
    "Ein Glas Wasser und 3 tiefe Atemzüge wirken Wunder.",
    "Schreib jemandem eine nette Nachricht — Geben macht happy!",
  ],
  medium: [
    "Du bist auf einem guten Weg — keep going! 💪",
    "Dein Gesicht zeigt: du bist fokussiert. Gönn dir trotzdem eine Mini-Pause.",
    "Tipp: Alle 25 Minuten kurz vom Bildschirm wegsehen.",
  ],
  high: [
    "Du strahlst! Das überträgt sich auf deine Arbeit. ✨",
    "Deine positive Energie heute ist ansteckend — weiter so!",
    "Peak Happiness erreicht! So macht Arbeit Spaß.",
  ],
};
