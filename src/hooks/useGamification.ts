import { useState, useEffect, useRef, useCallback } from "react";
import { ExpressionSnapshot, GamificationState, ToastItem } from "../utils/types";
import { loadGamification, saveGamification, createDefaultState } from "../utils/gamification-storage";
import { ACHIEVEMENTS, checkAchievement, getAchievementTitle } from "../utils/achievements";
import { getLevelForXP } from "../utils/levels";
import { getTodayKey } from "../utils/storage";
import { getNudges, t } from "../i18n";

interface Props {
  currentExpression: ExpressionSnapshot | null;
  streakCurrent: number;
  isRunning: boolean;
}

export function useGamification({ currentExpression, streakCurrent, isRunning }: Props) {
  const [state, setState] = useState<GamificationState>(loadGamification);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevExpr = useRef<ExpressionSnapshot | null>(null);
  const prevHappy = useRef(0);
  const usageTickRef = useRef<number | null>(null);
  const lastUsageTick = useRef<number>(Date.now());

  // Track usage minutes
  useEffect(() => {
    if (isRunning) {
      lastUsageTick.current = Date.now();
      usageTickRef.current = window.setInterval(() => {
        const now = Date.now();
        const deltaMin = (now - lastUsageTick.current) / 60000;
        lastUsageTick.current = now;
        setState((prev) => {
          const next = {
            ...prev,
            counters: {
              ...prev.counters,
              totalUsageMinutes: prev.counters.totalUsageMinutes + deltaMin,
            },
            xp: prev.xp + 1, // 1 XP per minute
          };
          const newLevel = getLevelForXP(next.xp).level;
          next.level = newLevel;
          saveGamification(next);
          return next;
        });
      }, 60000);
    }
    return () => {
      if (usageTickRef.current) {
        clearInterval(usageTickRef.current);
        usageTickRef.current = null;
      }
    };
  }, [isRunning]);

  // Nudge timer — send a motivational message every ~15s
  const nudgeRef = useRef<number | null>(null);
  const lastNudgeIdx = useRef(-1);
  useEffect(() => {
    if (!isRunning) {
      if (nudgeRef.current) clearInterval(nudgeRef.current);
      return;
    }
    nudgeRef.current = window.setInterval(() => {
      const happy = prevHappy.current;
      const cat = happy > 60 ? "high" : happy > 30 ? "medium" : "low";
      const pool = getNudges().filter((n) => n.category === cat);
      let idx: number;
      do { idx = Math.floor(Math.random() * pool.length); } while (idx === lastNudgeIdx.current && pool.length > 1);
      lastNudgeIdx.current = idx;
      const nudge = pool[idx];
      setToasts((prev) => [...prev, {
        id: `nudge-${Date.now()}`,
        emoji: nudge.emoji,
        title: nudge.text,
        subtitle: "",
        type: "nudge" as const,
      }]);
    }, 15000);
    return () => {
      if (nudgeRef.current) clearInterval(nudgeRef.current);
    };
  }, [isRunning]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fireConfetti = useCallback(() => {
    setConfettiTrigger((n) => n + 1);
  }, []);

  // Process each new expression
  useEffect(() => {
    if (!currentExpression || currentExpression === prevExpr.current) return;
    prevExpr.current = currentExpression;

    setState((prev) => {
      const next = { ...prev };
      const c = { ...next.counters };
      const r = { ...next.records };
      const expr = currentExpression;
      let toastQueued = false; // max 1 toast per tick to avoid spam

      // Update counters
      c.totalScans++;
      if (expr.happy > 70) c.happyScansAbove70++;
      if (expr.surprised > 50) c.surprisedScansAbove50++;
      if (expr.neutral > 50) c.neutralScansAbove50++;
      if (expr.happy > c.peakHappinessEver) c.peakHappinessEver = expr.happy;

      // Consecutive happy streak
      if (expr.happy > 50) {
        c.consecutiveHappyScans++;
        if (c.consecutiveHappyScans > c.maxConsecutiveHappyScans) {
          c.maxConsecutiveHappyScans = c.consecutiveHappyScans;
        }
      } else {
        c.consecutiveHappyScans = 0;
      }

      // Time-of-day
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 5) c.nightScans++;
      if (hour >= 5 && hour < 7) c.earlyScans++;

      // Accumulate happy minutes (~10 scans/sec at 100ms)
      if (expr.happy > 50) {
        r.totalHappyMinutes += 0.1 / 60; // 100ms in minutes
      }

      next.counters = c;

      // ── Personal Records ──
      // Happy streak record (in seconds, ~10 scans = 1 sec)
      const streakSec = Math.floor(c.consecutiveHappyScans / 10);
      const prevStreakSec = Math.floor(r.longestHappyStreak);
      if (streakSec > prevStreakSec && streakSec >= 3) {
        r.longestHappyStreak = streakSec;
        if (!toastQueued) {
          toastQueued = true;
          addToast({
            id: `record-streak-${streakSec}`,
            emoji: "🔥",
            title: t("happy_streak", { value: streakSec }),
            subtitle: t("toast_new_record"),
            type: "record",
          });
          next.xp += 2;
        }
      }

      // Peak happiness record
      if (expr.happy > r.highestHappyScore && expr.happy >= 60) {
        const prevPeak = r.highestHappyScore;
        r.highestHappyScore = expr.happy;
        // Only toast on meaningful jumps (every 5%)
        if (Math.floor(expr.happy / 5) > Math.floor(prevPeak / 5) && !toastQueued) {
          toastQueued = true;
          addToast({
            id: `record-peak-${expr.happy}`,
            emoji: "⚡",
            title: t("peak_happy", { value: expr.happy }),
            subtitle: t("toast_new_record"),
            type: "record",
          });
          next.xp += 2;
        }
      }

      // Happy minutes milestones (every 5 min)
      const happyMinNow = Math.floor(r.totalHappyMinutes);
      const happyMinPrev = Math.floor(prev.records.totalHappyMinutes);
      if (happyMinNow > happyMinPrev && happyMinNow % 5 === 0 && happyMinNow > 0 && !toastQueued) {
        toastQueued = true;
        addToast({
          id: `record-happymin-${happyMinNow}`,
          emoji: "😊",
          title: t("happy_minutes", { value: happyMinNow }),
          subtitle: t("toast_milestone"),
          type: "record",
        });
        next.xp += 3;
      }

      // Session length milestones (every 10 min)
      const sessionMin = Math.floor(c.totalUsageMinutes);
      const prevSessionMin = Math.floor(prev.counters.totalUsageMinutes);
      if (sessionMin > r.longestSession) r.longestSession = sessionMin;
      if (sessionMin > prevSessionMin && sessionMin % 10 === 0 && sessionMin > 0 && !toastQueued) {
        toastQueued = true;
        addToast({
          id: `record-session-${sessionMin}`,
          emoji: "⏱️",
          title: t("session_minutes", { value: sessionMin }),
          subtitle: t("toast_milestone"),
          type: "record",
        });
        next.xp += 3;
      }

      next.records = r;

      prevHappy.current = expr.happy;

      // ── Check achievements (max 1 per tick) ──
      const prevLevel = prev.level;
      if (!toastQueued) {
        for (const ach of ACHIEVEMENTS) {
          if (next.achievements[ach.id] != null) continue;
          if (checkAchievement(ach.id, next, streakCurrent)) {
            next.achievements[ach.id] = Date.now();
            next.xp += 50;
            toastQueued = true;
            addToast({
              id: `ach-${ach.id}`,
              emoji: ach.emoji,
              title: getAchievementTitle(ach.id),
              subtitle: t("toast_unlocked"),
              type: "achievement",
            });
            fireConfetti();
            break; // only 1 achievement per tick
          }
        }
      }

      // Recalc level
      const newLevel = getLevelForXP(next.xp);
      next.level = newLevel.level;
      if (newLevel.level > prevLevel) {
        addToast({
          id: `levelup-${newLevel.level}`,
          emoji: newLevel.emoji,
          title: t("toast_level", { level: newLevel.level }),
          subtitle: newLevel.title,
          type: "levelup",
        });
        fireConfetti();
      }

      saveGamification(next);
      return next;
    });
  }, [currentExpression, streakCurrent, addToast, fireConfetti]);

  // Award streak XP once per day
  useEffect(() => {
    if (streakCurrent <= 0) return;
    const today = getTodayKey();
    const streakXPKey = `happyface_streak_xp_${today}`;
    if (!localStorage.getItem(streakXPKey)) {
      localStorage.setItem(streakXPKey, "1");
      setState((prev) => {
        const next = { ...prev, xp: prev.xp + 5 };
        next.level = getLevelForXP(next.xp).level;
        saveGamification(next);
        return next;
      });
    }
  }, [streakCurrent]);

  const resetGamification = useCallback(() => {
    const fresh = createDefaultState();
    saveGamification(fresh);
    setState(fresh);
    setToasts([]);
    prevExpr.current = null;
  }, []);

  return {
    gamification: state,
    toasts,
    confettiTrigger,
    dismissToast,
    resetGamification,
  };
}
