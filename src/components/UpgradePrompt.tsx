import { useState } from "react";
import { UpgradePrompt as PromptType } from "../hooks/usePremium";

interface Props {
  prompt: PromptType;
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  onDismiss: (prompt: PromptType) => void;
}

export function UpgradePrompt({ prompt, onPurchase, onRestore, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    await onPurchase();
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    await onRestore();
    setLoading(false);
  };

  const title =
    prompt === "hours"
      ? "Du nutzt HappyFace gerne?"
      : "Wochenvergleich freischalten?";

  const message =
    prompt === "hours"
      ? "Du hast bereits mehrere Stunden aktiv getrackt. Mit Premium speicherst du unbegrenzt Tage und kannst deine Woche vergleichen."
      : "Du nutzt HappyFace jetzt seit einer Woche! Möchtest du deine Daten behalten und Wochen vergleichen? In der Free-Version werden nur 5 Tage gespeichert.";

  return (
    <div className="upgrade-overlay">
      <div className="upgrade-card">
        <span className="upgrade-icon">⭐</span>
        <h3 className="upgrade-title">{title}</h3>
        <p className="upgrade-message">{message}</p>

        <div className="upgrade-features">
          <div className="upgrade-feature">
            <span>✓</span> Unbegrenzter Datenverlauf
          </div>
          <div className="upgrade-feature">
            <span>✓</span> Wochenvergleich &amp; Trends
          </div>
          <div className="upgrade-feature">
            <span>✓</span> Vollständige 7-Tage Statistiken
          </div>
        </div>

        <button
          className="upgrade-buy-btn"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? "…" : "Premium freischalten"}
        </button>

        <div className="upgrade-secondary">
          <button
            className="upgrade-restore-btn"
            onClick={handleRestore}
            disabled={loading}
          >
            Kauf wiederherstellen
          </button>
          <button
            className="upgrade-dismiss-btn"
            onClick={() => onDismiss(prompt)}
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
