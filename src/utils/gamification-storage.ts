import { GamificationState } from "./types";

const KEY = "happyface_gamification";

export function createDefaultState(): GamificationState {
  return {
    achievements: {},
    xp: 0,
    level: 1,
    records: {
      longestHappyStreak: 0,
      highestHappyScore: 0,
      totalHappyMinutes: 0,
      longestSession: 0,
    },
    counters: {
      totalScans: 0,
      totalUsageMinutes: 0,
      happyScansAbove70: 0,
      surprisedScansAbove50: 0,
      neutralScansAbove50: 0,
      nightScans: 0,
      earlyScans: 0,
      peakHappinessEver: 0,
      consecutiveHappyScans: 0,
      maxConsecutiveHappyScans: 0,
    },
  };
}

export function loadGamification(): GamificationState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields
      const defaults = createDefaultState();
      return {
        ...defaults,
        ...parsed,
        records: { ...defaults.records, ...parsed.records },
        counters: { ...defaults.counters, ...parsed.counters },
      };
    }
  } catch { /* ignore */ }
  return createDefaultState();
}

export function saveGamification(state: GamificationState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
