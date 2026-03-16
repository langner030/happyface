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
