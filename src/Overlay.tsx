import { useEffect, useState } from "react";

type EmotionUpdate = {
  happy: number;
  isRunning: boolean;
};

/** Map happy score (0–100) to a smooth HSL hue:
 *  0 → red (0°), 50 → amber (60°), 100 → green (120°). */
function scoreToColor(happy: number): string {
  const clamped = Math.max(0, Math.min(100, happy));
  const hue = (clamped / 100) * 120;
  return `hsla(${hue}, 85%, 50%, 0.9)`;
}

export default function Overlay() {
  const [happy, setHappy] = useState(50);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<EmotionUpdate>("emotion-update", (e) => {
          setHappy(e.payload.happy);
          setActive(e.payload.isRunning);
        })
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // dev-mode fallback
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const color = active ? scoreToColor(happy) : "transparent";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `10px solid ${color}`,
        boxSizing: "border-box",
        pointerEvents: "none",
        transition: "border-color 0.8s ease",
      }}
    />
  );
}
