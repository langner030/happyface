import { useEffect, useRef, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ExpressionSnapshot } from "../utils/types";
import { loadDayData, getLast7Days } from "../utils/storage";

// ─── Types ───────────────────────────────────────────────────────
type Range = "60s" | "60m" | "24h" | "7d";

interface Props {
  snapshots: ExpressionSnapshot[];
  currentExpression: ExpressionSnapshot | null;
}

interface Point {
  label: string;
  happy: number;
  sad: number;
  neutral: number;
  angry: number;
  surprised: number;
  fearful: number;
}

const EMOTIONS: { key: keyof Omit<Point, "label">; color: string; emoji: string }[] = [
  { key: "happy",     color: "#34d399", emoji: "😊" },
  { key: "neutral",   color: "#94a3b8", emoji: "😐" },
  { key: "sad",       color: "#f87171", emoji: "😢" },
  { key: "angry",     color: "#fb923c", emoji: "😠" },
  { key: "surprised", color: "#a78bfa", emoji: "😲" },
  { key: "fearful",   color: "#fbbf24", emoji: "😨" },
];

// ─── Helpers ─────────────────────────────────────────────────────
function avgSnaps(snaps: ExpressionSnapshot[]): Omit<Point, "label"> {
  if (!snaps.length) return { happy: 0, sad: 0, neutral: 0, angry: 0, surprised: 0, fearful: 0 };
  const sum = snaps.reduce(
    (acc, s) => ({
      happy: acc.happy + s.happy,
      sad: acc.sad + s.sad,
      neutral: acc.neutral + s.neutral,
      angry: acc.angry + s.angry,
      surprised: acc.surprised + s.surprised,
      fearful: acc.fearful + s.fearful,
    }),
    { happy: 0, sad: 0, neutral: 0, angry: 0, surprised: 0, fearful: 0 }
  );
  const n = snaps.length;
  return {
    happy:     Math.round(sum.happy / n),
    sad:       Math.round(sum.sad / n),
    neutral:   Math.round(sum.neutral / n),
    angry:     Math.round(sum.angry / n),
    surprised: Math.round(sum.surprised / n),
    fearful:   Math.round(sum.fearful / n),
  };
}

// ─── Builders for each range ─────────────────────────────────────
function build60m(snapshots: ExpressionSnapshot[]): Point[] {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const buckets = new Map<number, ExpressionSnapshot[]>();

  for (let m = 59; m >= 0; m--) {
    buckets.set(m, []);
  }

  for (const s of snapshots) {
    if (s.timestamp < cutoff) continue;
    const minutesAgo = Math.floor((now - s.timestamp) / 60000);
    if (minutesAgo >= 0 && minutesAgo < 60) {
      buckets.get(minutesAgo)?.push(s);
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0]) // oldest first
    .reverse()
    .map(([m, snaps]) => ({
      label: m === 0 ? "jetzt" : `${m}m`,
      ...avgSnaps(snaps),
    }))
    .reverse()
    .reverse(); // oldest→newest left→right
}

function build24h(todaySnapshots: ExpressionSnapshot[]): Point[] {
  const now = new Date();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  // Load yesterday too
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split("T")[0];
  const yesterdayData = loadDayData(yesterdayKey);
  const allSnaps = [
    ...(yesterdayData?.snapshots ?? []),
    ...todaySnapshots,
  ].filter((s) => s.timestamp >= cutoff);

  const buckets = new Map<number, ExpressionSnapshot[]>();
  for (let h = 0; h < 24; h++) buckets.set(h, []);

  for (const s of allSnaps) {
    const h = new Date(s.timestamp).getHours();
    buckets.get(h)?.push(s);
  }

  // Build ordered from current hour backwards
  const currentHour = now.getHours();
  const points: Point[] = [];
  for (let i = 23; i >= 0; i--) {
    const h = (currentHour - i + 24) % 24;
    const label = `${String(h).padStart(2, "0")}h`;
    points.push({ label, ...avgSnaps(buckets.get(h) ?? []) });
  }
  return points;
}

function build7d(): Point[] {
  const days = getLast7Days();
  return days.map((d) => {
    const date = new Date(d.date);
    const label = date.toLocaleDateString("de-DE", { weekday: "short" });
    const snaps = d.snapshots;
    return { label, ...avgSnaps(snaps) };
  });
}

// ─── Live 60s rolling window ─────────────────────────────────────
interface LivePoint extends Omit<Point, "label"> { t: number }

// ─── Component ───────────────────────────────────────────────────
export function Timeline({ snapshots, currentExpression }: Props) {
  const [range, setRange] = useState<Range>("60s");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // ── Live 60s state ──
  const [live, setLive] = useState<LivePoint[]>([]);
  const buffer = useRef<ExpressionSnapshot[]>([]);
  const lastFlush = useRef<number>(Date.now());
  const prevExpr = useRef<ExpressionSnapshot | null>(null);

  // Seed live window from existing snapshots
  useEffect(() => {
    const seeded = snapshots.slice(-60).map((s, i, arr) => ({
      t: i - arr.length + 1,
      happy: s.happy, sad: s.sad, neutral: s.neutral,
      angry: s.angry, surprised: s.surprised, fearful: s.fearful,
    }));
    setLive(seeded);
  }, []);

  // Accumulate + flush per second for live view
  useEffect(() => {
    if (!currentExpression) return;
    if (currentExpression === prevExpr.current) return;
    prevExpr.current = currentExpression;

    buffer.current.push(currentExpression);

    const now = Date.now();
    if (now - lastFlush.current < 1000) return;
    lastFlush.current = now;

    const buf = buffer.current;
    buffer.current = [];
    const avg = avgSnaps(buf);

    setLive((prev) => [
      ...prev.map((p) => ({ ...p, t: p.t - 1 })),
      { t: 0, ...avg },
    ].slice(-60));
  }, [currentExpression]);

  // ── Static range data ──
  const staticData = useMemo<Point[]>(() => {
    if (range === "60m") return build60m(snapshots);
    if (range === "24h") return build24h(snapshots);
    if (range === "7d")  return build7d();
    return [];
  }, [range, snapshots, currentExpression]); // re-calc when new snapshot arrives

  // ── Merge live into Point[] for uniform rendering ──
  const liveAsPoints: Point[] = live.map((p) => ({
    label: p.t === 0 ? "jetzt" : `${Math.abs(p.t)}s`,
    happy: p.happy, sad: p.sad, neutral: p.neutral,
    angry: p.angry, surprised: p.surprised, fearful: p.fearful,
  }));

  const data = range === "60s" ? liveAsPoints : staticData;
  const isEmpty = data.length < 2;

  const toggleEmotion = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const xInterval = range === "60s" ? 9
    : range === "60m" ? 9
    : range === "24h" ? 3
    : 0;

  return (
    <div className="timeline-container">
      {/* ── Header ── */}
      <div className="timeline-header">
        <h3 className="section-title">Verlauf</h3>
        <div className="range-tabs">
          {(["60s", "60m", "24h", "7d"] as Range[]).map((r) => (
            <button
              key={r}
              className={`range-btn ${range === r ? "range-btn--active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="timeline-empty">
          <p>Noch keine Daten für diesen Zeitraum.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={195}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                interval={xInterval}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <ReferenceLine y={50} stroke="#2a3040" strokeDasharray="4 4" />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                labelStyle={{ color: "#64748b", marginBottom: 4 }}
                formatter={(value: number, name: string) => {
                  const e = EMOTIONS.find((x) => x.key === name);
                  return [`${value}%`, e ? `${e.emoji}` : name];
                }}
              />
              {EMOTIONS.map((e) => (
                <Line
                  key={e.key}
                  type="monotone"
                  dataKey={e.key}
                  stroke={e.color}
                  strokeWidth={e.key === "happy" ? 2 : 1.5}
                  dot={false}
                  isAnimationActive={false}
                  hide={hidden.has(e.key)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="timeline-legend">
            {EMOTIONS.map((e) => (
              <button
                key={e.key}
                className={`legend-btn ${hidden.has(e.key) ? "legend-btn--off" : ""}`}
                onClick={() => toggleEmotion(e.key)}
              >
                <span className="legend-dot" style={{ background: hidden.has(e.key) ? "#334155" : e.color }} />
                <span className="legend-label">{e.emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
