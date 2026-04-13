import { useState, useEffect, useCallback, useRef } from "react";
import { PremiumState, FREE_LIMITS } from "../utils/types";

const PREMIUM_KEY = "happyface_premium";
const PRODUCT_ID = "com.happyface.premium.monthly";
const PRODUCT_TYPE = "subs" as const;

function loadPremiumState(): PremiumState {
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    isPremium: false,
    totalUsageMs: 0,
    firstLaunchDate: new Date().toISOString().split("T")[0],
    hoursDismissed: false,
    weekDismissed: false,
  };
}

function savePremiumState(state: PremiumState): void {
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(state));
}

export type UpgradePrompt = "hours" | "week" | null;

export function usePremium(isRunning: boolean) {
  const [state, setState] = useState<PremiumState>(loadPremiumState);
  const [showUpgrade, setShowUpgrade] = useState<UpgradePrompt>(null);
  const tickRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Track active usage time while running
  useEffect(() => {
    if (state.isPremium) return;

    if (isRunning) {
      lastTickRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        setState((prev) => {
          const next = { ...prev, totalUsageMs: prev.totalUsageMs + delta };
          savePremiumState(next);
          return next;
        });
      }, 30_000); // update every 30s
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isRunning, state.isPremium]);

  // Check if we should show upgrade prompts
  useEffect(() => {
    if (state.isPremium) {
      setShowUpgrade(null);
      return;
    }

    // Hours-based prompt: after 3h of active usage
    if (
      state.totalUsageMs >= FREE_LIMITS.usagePromptMs &&
      !state.hoursDismissed
    ) {
      setShowUpgrade("hours");
      return;
    }

    // Week-based prompt: after 7 days since first launch
    const firstLaunch = new Date(state.firstLaunchDate).getTime();
    const daysSince = (Date.now() - firstLaunch) / (1000 * 60 * 60 * 24);
    if (daysSince >= FREE_LIMITS.weekPromptDays && !state.weekDismissed) {
      setShowUpgrade("week");
      return;
    }
  }, [state]);

  const dismissPrompt = useCallback((prompt: UpgradePrompt) => {
    setState((prev) => {
      const next = {
        ...prev,
        hoursDismissed: prompt === "hours" ? true : prev.hoursDismissed,
        weekDismissed: prompt === "week" ? true : prev.weekDismissed,
      };
      savePremiumState(next);
      return next;
    });
    setShowUpgrade(null);
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    try {
      const { purchase, getProductStatus } = await import(
        "@choochmeque/tauri-plugin-iap-api"
      );

      // Start subscription flow
      await purchase(PRODUCT_ID, PRODUCT_TYPE);

      // Verify active subscription
      const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);
      if (status?.isOwned) {
        setState((prev) => {
          const next = { ...prev, isPremium: true };
          savePremiumState(next);
          return next;
        });
        setShowUpgrade(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Subscription failed:", err);
      return false;
    }
  }, []);

  const restorePurchase = useCallback(async (): Promise<boolean> => {
    try {
      const { restorePurchases, getProductStatus } = await import(
        "@choochmeque/tauri-plugin-iap-api"
      );

      await restorePurchases(PRODUCT_TYPE);
      const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);

      if (status?.isOwned) {
        setState((prev) => {
          const next = { ...prev, isPremium: true };
          savePremiumState(next);
          return next;
        });
        setShowUpgrade(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Restore failed:", err);
      return false;
    }
  }, []);

  // Check subscription status on mount — also detects expired subscriptions
  // so a lapsed user loses Premium until they renew.
  useEffect(() => {
    (async () => {
      try {
        const { getProductStatus } = await import(
          "@choochmeque/tauri-plugin-iap-api"
        );
        const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);
        const active = !!status?.isOwned;
        setState((prev) => {
          if (prev.isPremium === active) return prev;
          const next = { ...prev, isPremium: active };
          savePremiumState(next);
          return next;
        });
      } catch {
        // IAP not available (dev mode / non-macOS) — keep cached state
      }
    })();
  }, []);

  return {
    isPremium: state.isPremium,
    totalUsageMs: state.totalUsageMs,
    showUpgrade,
    dismissPrompt,
    purchasePremium,
    restorePurchase,
  };
}
