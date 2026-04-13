import { useState, useEffect, useCallback, useRef } from "react";
import {
  getProductStatus,
  getProducts,
  onPurchaseUpdated,
  purchase,
  PurchaseState,
  restorePurchases,
  type Product,
} from "@choochmeque/tauri-plugin-iap-api";
import { PremiumState, FREE_LIMITS } from "../utils/types";

const PREMIUM_KEY = "happyface_premium";
const PRODUCT_ID = "com.happyface.premium";
const PRODUCT_TYPE = "inapp" as const;
export type PremiumStatusMessage =
  | "purchase_success"
  | "purchase_pending"
  | "purchase_cancelled"
  | "purchase_failed"
  | "restore_success"
  | "restore_missing"
  | "restore_failed";

function loadPremiumState(): PremiumState {
  try {
    const raw = localStorage.getItem(PREMIUM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PremiumState>;
      return {
        isPremium: parsed.isPremium ?? false,
        totalUsageMs: parsed.totalUsageMs ?? 0,
        firstLaunchDate: parsed.firstLaunchDate ?? new Date().toISOString().split("T")[0],
        usagePromptDismissed: parsed.usagePromptDismissed ?? false,
        dayPromptDismissed: parsed.dayPromptDismissed ?? false,
      };
    }
  } catch { /* ignore */ }
  return {
    isPremium: false,
    totalUsageMs: 0,
    firstLaunchDate: new Date().toISOString().split("T")[0],
    usagePromptDismissed: false,
    dayPromptDismissed: false,
  };
}

function savePremiumState(state: PremiumState): void {
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(state));
}

export type UpgradePromptKind = "usage_soft" | "days_soft" | "usage_hard" | null;

export function usePremium(isRunning: boolean) {
  const [state, setState] = useState<PremiumState>(loadPremiumState);
  const [showUpgrade, setShowUpgrade] = useState<UpgradePromptKind>(null);
  const tickRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const [product, setProduct] = useState<Product | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [statusMessage, setStatusMessage] = useState<PremiumStatusMessage | null>(null);

  const markPremium = useCallback(() => {
    setState((prev) => {
      if (prev.isPremium) return prev;
      const next = { ...prev, isPremium: true };
      savePremiumState(next);
      return next;
    });
    setShowUpgrade(null);
  }, []);

  const revokePremium = useCallback(() => {
    setState((prev) => {
      if (!prev.isPremium) return prev;
      const next = { ...prev, isPremium: false };
      savePremiumState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => Promise<void>) | undefined;

    async function setupStore() {
      try {
        const listener = await onPurchaseUpdated((updatedPurchase) => {
          if (
            updatedPurchase.productId === PRODUCT_ID &&
            updatedPurchase.purchaseState === PurchaseState.PURCHASED
          ) {
            setStatusMessage("purchase_success");
            markPremium();
          }
        });

        unsubscribe = () => listener.unregister();

        const [{ products }, ownedStatus] = await Promise.all([
          getProducts([PRODUCT_ID], PRODUCT_TYPE),
          getProductStatus(PRODUCT_ID, PRODUCT_TYPE),
        ]);

        if (cancelled) {
          await listener.unregister();
          return;
        }

        setProduct(products[0] ?? null);
        setStoreReady(true);

        if (
          ownedStatus.isOwned &&
          (ownedStatus.purchaseState == null || ownedStatus.purchaseState === PurchaseState.PURCHASED)
        ) {
          markPremium();
        } else {
          revokePremium();
        }
      } catch {
        if (cancelled) return;
        setStoreReady(false);
        setProduct(null);
      }
    }

    setupStore();

    return () => {
      cancelled = true;
      void unsubscribe?.();
    };
  }, [markPremium, revokePremium]);

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

    if (state.totalUsageMs >= FREE_LIMITS.hardUsagePromptMs) {
      setShowUpgrade("usage_hard");
      return;
    }

    const firstLaunch = new Date(state.firstLaunchDate).getTime();
    const daysSince = (Date.now() - firstLaunch) / (1000 * 60 * 60 * 24);

    if (
      state.totalUsageMs >= FREE_LIMITS.softUsagePromptMs &&
      !state.usagePromptDismissed
    ) {
      setShowUpgrade("usage_soft");
      return;
    }

    if (daysSince >= FREE_LIMITS.softDayPromptDays && !state.dayPromptDismissed) {
      setShowUpgrade("days_soft");
      return;
    }

    setShowUpgrade(null);
  }, [state]);

  const dismissPrompt = useCallback((prompt: UpgradePromptKind) => {
    if (prompt === "usage_hard") {
      return;
    }

    setState((prev) => {
      const next = {
        ...prev,
        usagePromptDismissed: prompt === "usage_soft" ? true : prev.usagePromptDismissed,
        dayPromptDismissed: prompt === "days_soft" ? true : prev.dayPromptDismissed,
      };
      savePremiumState(next);
      return next;
    });
    setShowUpgrade(null);
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    if (loadingPurchase) {
      return false;
    }

    setLoadingPurchase(true);
    setStatusMessage(null);

    try {
      const result = await purchase(PRODUCT_ID, PRODUCT_TYPE);
      const isPurchased = result.purchaseState === PurchaseState.PURCHASED;
      if (isPurchased) {
        setStatusMessage("purchase_success");
        markPremium();
      } else if (result.purchaseState === PurchaseState.PENDING) {
        setStatusMessage("purchase_pending");
      } else {
        setStatusMessage("purchase_cancelled");
      }
      return isPurchased;
    } catch {
      setStatusMessage("purchase_failed");
      return false;
    } finally {
      setLoadingPurchase(false);
    }
  }, [loadingPurchase, markPremium]);

  const restorePurchase = useCallback(async (): Promise<boolean> => {
    if (loadingPurchase) {
      return false;
    }

    setLoadingPurchase(true);
    setStatusMessage(null);

    try {
      const { purchases } = await restorePurchases(PRODUCT_TYPE);
      const restored = purchases.some(
        (entry) => entry.productId === PRODUCT_ID && entry.purchaseState === PurchaseState.PURCHASED
      );

      if (restored) {
        setStatusMessage("restore_success");
        markPremium();
        return true;
      }

      setStatusMessage("restore_missing");
      return false;
    } catch {
      setStatusMessage("restore_failed");
      return false;
    } finally {
      setLoadingPurchase(false);
    }
  }, [loadingPurchase, markPremium]);

  return {
    isPremium: state.isPremium,
    totalUsageMs: state.totalUsageMs,
    showUpgrade,
    isUpgradeRequired: showUpgrade === "usage_hard",
    canDismissUpgrade: showUpgrade !== "usage_hard",
    dismissPrompt,
    purchasePremium,
    restorePurchase,
    product,
    storeReady,
    loadingPurchase,
    statusMessage,
  };
}
