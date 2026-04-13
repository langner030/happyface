import { useEffect, useState, useRef } from "react";
import { ToastItem } from "../utils/types";

interface FeedItem extends ToastItem {
  addedAt: number;
  y: number;      // 0 = bottom, increases upward
  opacity: number;
}

const LIFETIME = 3000;   // total visible time in ms
const FADE_START = 1500; // start fading after this
const SPEED = 40;        // pixels per second upward

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function EventFeed({ toasts, onDismiss }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  // Add new toasts as feed items at the bottom
  useEffect(() => {
    for (const t of toasts) {
      if (!processedIds.current.has(t.id)) {
        processedIds.current.add(t.id);
        setItems((prev) => [
          ...prev,
          { ...t, addedAt: Date.now(), y: 0, opacity: 1 },
        ]);
        setTimeout(() => onDismiss(t.id), 100);
      }
    }
  }, [toasts, onDismiss]);

  // Animate: move up + fade out
  useEffect(() => {
    let last = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const dt = (now - last) / 1000; // seconds
      last = now;

      setItems((prev) => {
        const currentTime = Date.now();
        return prev
          .map((item) => {
            const age = currentTime - item.addedAt;
            if (age > LIFETIME) return null;
            const opacity = age < FADE_START ? 1 : 1 - (age - FADE_START) / (LIFETIME - FADE_START);
            return { ...item, y: item.y + SPEED * dt, opacity: Math.max(0, opacity) };
          })
          .filter((item): item is FeedItem => item !== null);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="event-feed">
      {items.map((item) => (
        <div
          key={item.id}
          className={`event-feed-item ${item.type === "levelup" ? "event-feed-item--levelup" : ""} ${item.type === "record" ? "event-feed-item--record" : ""} ${item.type === "nudge" ? "event-feed-item--nudge" : ""}`}
          style={{
            opacity: item.opacity,
            transform: `translateY(-${item.y}px)`,
          }}
        >
          <span className="event-feed-emoji">{item.emoji}</span>
          <div className="event-feed-text">
            <span className="event-feed-title">{item.title}</span>
            <span className="event-feed-sub">{item.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
