import { useState } from "react";
import { type Product } from "@choochmeque/tauri-plugin-iap-api";
import { PremiumStatusMessage, UpgradePromptKind as PromptType } from "../hooks/usePremium";
import { t } from "../i18n";

interface Props {
  prompt: PromptType;
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  onDismiss: (prompt: PromptType) => void;
  canDismiss: boolean;
  loading?: boolean;
  product?: Product | null;
  statusMessage?: PremiumStatusMessage | null;
  storeReady?: boolean;
}

export function UpgradePrompt({
  prompt,
  onPurchase,
  onRestore,
  onDismiss,
  canDismiss,
  loading = false,
  product,
  statusMessage,
  storeReady = false,
}: Props) {
  const [pendingAction, setPendingAction] = useState<"purchase" | "restore" | null>(null);

  const handlePurchase = async () => {
    setPendingAction("purchase");
    await onPurchase();
    setPendingAction(null);
  };

  const handleRestore = async () => {
    setPendingAction("restore");
    await onRestore();
    setPendingAction(null);
  };

  const title =
    prompt === "usage_soft"
      ? t("upgrade_soft_usage_title")
      : prompt === "days_soft"
        ? t("upgrade_soft_day_title")
        : t("upgrade_hard_usage_title");

  const message =
    prompt === "usage_soft"
      ? t("upgrade_soft_usage_message")
      : prompt === "days_soft"
        ? t("upgrade_soft_day_message")
        : t("upgrade_hard_usage_message");

  const ctaLabel = product?.formattedPrice
    ? `${t("unlock_premium")} ${t("for_price", { price: product.formattedPrice })}`
    : t("unlock_premium");

  return (
    <div className="upgrade-overlay">
      <div className="upgrade-card">
        <span className="upgrade-icon">⭐</span>
        <h3 className="upgrade-title">{title}</h3>
        <p className="upgrade-message">{message}</p>
        {prompt === "usage_hard" && (
          <p className="upgrade-required-note">{t("upgrade_required_note")}</p>
        )}

        <div className="upgrade-features">
          <div className="upgrade-feature">
            <span>✓</span> {t("upgrade_feature_history")}
          </div>
          <div className="upgrade-feature">
            <span>✓</span> {t("upgrade_feature_weekly")}
          </div>
          <div className="upgrade-feature">
            <span>✓</span> {t("upgrade_feature_stats")}
          </div>
        </div>

        <button
          className="upgrade-buy-btn"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading && pendingAction === "purchase" ? "…" : ctaLabel}
        </button>

        <div className="upgrade-secondary">
          <button
            className="upgrade-restore-btn"
            onClick={handleRestore}
            disabled={loading}
          >
            {loading && pendingAction === "restore" ? "…" : t("restore_purchase")}
          </button>
          {canDismiss && (
            <button
              className="upgrade-dismiss-btn"
              onClick={() => onDismiss(prompt)}
              disabled={loading}
            >
              {t("later")}
            </button>
          )}
        </div>
        {!storeReady && <p className="upgrade-status">{t("store_unavailable")}</p>}
        {statusMessage && <p className="upgrade-status">{t(statusMessage)}</p>}
      </div>
    </div>
  );
}
