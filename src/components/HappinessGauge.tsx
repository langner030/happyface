import { useMemo } from "react";
import { NUDGES, ExpressionSnapshot } from "../utils/types";

interface Props {
  score: number;
  isRunning: boolean;
  expressions?: ExpressionSnapshot | null;
}

interface MiniCircleProps {
  value: number;
  emoji: string;
  label: string;
  color: string;
}

function MiniCircle({ value, emoji, label, color }: MiniCircleProps) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="mini-circle" title={`${label}: ${value}%`}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="5"
        />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="mini-circle-inner">
        <span className="mini-emoji">{emoji}</span>
        <span className="mini-value" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
}

export function HappinessGauge({ score, isRunning, expressions }: Props) {
  const clampedScore = Math.min(100, Math.max(0, score));

  const color = useMemo(() => {
    if (clampedScore > 65) return "#34d399";
    if (clampedScore > 35) return "#fbbf24";
    return "#f87171";
  }, [clampedScore]);

  const emoji = useMemo(() => {
    if (!isRunning) return "😴";
    if (clampedScore > 75) return "😄";
    if (clampedScore > 55) return "🙂";
    if (clampedScore > 35) return "😐";
    if (clampedScore > 15) return "😕";
    return "😔";
  }, [clampedScore, isRunning]);

  const nudge = useMemo(() => {
    const category =
      clampedScore > 60 ? "high" : clampedScore > 30 ? "medium" : "low";
    const list = NUDGES[category];
    return list[Math.floor(Math.random() * list.length)];
  }, [Math.floor(clampedScore / 20)]);

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (clampedScore / 100) * circumference;

  const mini = expressions
    ? [
        { key: "neutral",   value: expressions.neutral,   emoji: "😐", label: "Neutral",   color: "#94a3b8" },
        { key: "sad",       value: expressions.sad,        emoji: "😢", label: "Sad",       color: "#f87171" },
        { key: "angry",     value: expressions.angry,      emoji: "😠", label: "Angry",     color: "#fb923c" },
        { key: "surprised", value: expressions.surprised,  emoji: "😲", label: "Surprised", color: "#a78bfa" },
      ]
    : null;

  return (
    <div className="gauge-container">
      <div className="gauge-row">
        {/* ── Main circle ── */}
        <div className="gauge-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r="54"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
            />
          </svg>
          <div className="gauge-inner">
            <span className="gauge-emoji">{emoji}</span>
            <span className="gauge-score" style={{ color }}>
              {isRunning ? `${clampedScore}%` : "—"}
            </span>
          </div>
        </div>

        {/* ── Mini circles ── */}
        {mini && isRunning && (
          <div className="mini-grid">
            {mini.map((m) => (
              <MiniCircle key={m.key} value={m.value} emoji={m.emoji} label={m.label} color={m.color} />
            ))}
          </div>
        )}
      </div>

      {isRunning && <p className="nudge-text">{nudge}</p>}
    </div>
  );
}
