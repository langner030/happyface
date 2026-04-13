import { useEffect, useState } from "react";
import { ToastItem } from "../utils/types";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function AchievementToast({ toasts, onDismiss }: Props) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!current && toasts.length > 0) {
      setCurrent(toasts[0]);
    }
  }, [toasts, current]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        onDismiss(current.id);
        setCurrent(null);
        setExiting(false);
      }, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [current, onDismiss]);

  if (!current) return null;

  const isLevelUp = current.type === "levelup";

  return (
    <div className={`achievement-toast ${exiting ? "achievement-toast--exit" : ""} ${isLevelUp ? "achievement-toast--levelup" : ""}`}>
      <span className="achievement-toast-emoji">{current.emoji}</span>
      <div className="achievement-toast-text">
        <span className="achievement-toast-title">{current.title}</span>
        <span className="achievement-toast-subtitle">{current.subtitle}</span>
      </div>
    </div>
  );
}
