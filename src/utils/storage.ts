import { DayData, StreakInfo, FREE_LIMITS } from "./types";

const STORAGE_KEY = "happyface_data";
const STREAK_KEY = "happyface_streak";

/** Remove day data older than the allowed limit for free users */
export function enforceStorageLimit(isPremium: boolean): void {
  if (isPremium) return;
  const maxDays = FREE_LIMITS.maxDaysStored;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffKey = cutoff.toISOString().split("T")[0];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(`${STORAGE_KEY}_`)) continue;
    const dateStr = key.replace(`${STORAGE_KEY}_`, "");
    if (dateStr < cutoffKey) {
      localStorage.removeItem(key);
    }
  }
}

export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function loadDayData(date?: string): DayData | null {
  const key = date || getTodayKey();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDayData(data: DayData): void {
  localStorage.setItem(`${STORAGE_KEY}_${data.date}`, JSON.stringify(data));
}

export function loadStreak(): StreakInfo {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { current: 0, best: 0, lastDate: "" };
  } catch {
    return { current: 0, best: 0, lastDate: "" };
  }
}

export function updateStreak(happinessScore: number): StreakInfo {
  const streak = loadStreak();
  const today = getTodayKey();

  if (streak.lastDate === today) return streak;

  // Count as "happy day" if average > 40%
  if (happinessScore > 40) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split("T")[0];

    if (streak.lastDate === yesterdayKey) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
    streak.best = Math.max(streak.best, streak.current);
    streak.lastDate = today;
  } else {
    streak.current = 0;
    streak.lastDate = today;
  }

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}

export function getLast7Days(isPremium = false): DayData[] {
  const maxDays = isPremium ? 7 : FREE_LIMITS.maxDaysStored;
  const days: DayData[] = [];
  for (let i = maxDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const data = loadDayData(key);
    if (data) days.push(data);
  }
  return days;
}
