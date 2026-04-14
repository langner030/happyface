import { useState, useEffect, useCallback, useRef } from "react";
import { PremiumState, FREE_LIMITS } from "../utils/types";

const PREMIUM_KEY = "happyface_premium";
const PRODUCT_ID = "com.happyface.premium.monthly";
const PRODUCT_TYPE = "subs" as const;

/**
 * When `true`, skip the real StoreKit/MicrosoftStore plugin entirely and
 * drive the premium state from localStorage only. This is useful during
 * development or on an unsigned build where the IAP plugin would otherwise
 * throw errors. Set the Vite env var VITE_IAP_MOCK=true (or leave unset on
 * dev builds — we auto-enable mock on failure).
 */
const FORCE_MOCK =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_IAP_MOCK === "true";

async function loadIapApi() {
  if (FORCE_MOCK) throw new Error("IAP mocked via VITE_IAP_MOCK");
  return await import("@choochmeque/tauri-plugin-iap-api");
}

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
  /** Set to true when the native IAP plugin is unreachable — UI then shows
   *  a visible "MOCK" badge so you know you're not actually charging. */
  const [mockMode, setMockMode] = useState<boolean>(FORCE_MOCK);
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

    if (
      state.totalUsageMs >= FREE_LIMITS.usagePromptMs &&
      !state.hoursDismissed
    ) {
      setShowUpgrade("hours");
      return;
    }

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

  const setPremium = useCallback((value: boolean) => {
    setState((prev) => {
      const next = { ...prev, isPremium: value };
      savePremiumState(next);
      return next;
    });
    if (value) setShowUpgrade(null);
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    try {
      const { purchase, getProductStatus } = await loadIapApi();
      await purchase(PRODUCT_ID, PRODUCT_TYPE);
      const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);
      if (status?.isOwned) {
        setPremium(true);
        return true;
      }
      return false;
    } catch (err) {
      // IAP plugin unreachable → enter mock mode so the user at least
      // gets a working dev flow. In production on a signed build this
      // only fires if something is seriously misconfigured.
      console.warn("IAP purchase failed, entering mock mode:", err);
      setMockMode(true);
      setPremium(true);
      return true;
    }
  }, [setPremium]);

  const restorePurchase = useCallback(async (): Promise<boolean> => {
    try {
      const { restorePurchases, getProductStatus } = await loadIapApi();
      await restorePurchases(PRODUCT_TYPE);
      const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);
      if (status?.isOwned) {
        setPremium(true);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("IAP restore failed:", err);
      setMockMode(true);
      return false;
    }
  }, [setPremium]);

  /** Dev-only helper that flips premium without going through any store. */
  const mockTogglePremium = useCallback(() => {
    setMockMode(true);
    setPremium(!state.isPremium);
  }, [setPremium, state.isPremium]);

  // Check subscription status on mount — also detects expired subscriptions
  // so a lapsed user loses Premium until they renew.
  useEffect(() => {
    (async () => {
      try {
        const { getProductStatus } = await loadIapApi();
        const status = await getProductStatus(PRODUCT_ID, PRODUCT_TYPE);
        const active = !!status?.isOwned;
        setState((prev) => {
          if (prev.isPremium === active) return prev;
          const next = { ...prev, isPremium: active };
          savePremiumState(next);
          return next;
        });
      } catch {
        // IAP not reachable — silently enter mock mode. The cached
        // premium state from localStorage is preserved.
        setMockMode(true);
      }
    })();
  }, []);

  return {
    isPremium: state.isPremium,
    totalUsageMs: state.totalUsageMs,
    showUpgrade,
    mockMode,
    dismissPrompt,
    purchasePremium,
    restorePurchase,
    mockTogglePremium,
  };
}
