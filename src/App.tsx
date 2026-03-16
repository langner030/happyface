import { useState, useEffect, useCallback, useRef } from "react";
import { useFaceDetection } from "./hooks/useFaceDetection";
import { useCameraWatcher } from "./hooks/useCameraWatcher";
import { HappinessGauge } from "./components/HappinessGauge";
import { Timeline } from "./components/Timeline";
import { StatsPanel } from "./components/StatsPanel";
import {
  loadDayData,
  saveDayData,
  getTodayKey,
  loadStreak,
  updateStreak,
  getLast7Days,
} from "./utils/storage";
import {
  ExpressionSnapshot,
  DayData,
  StreakInfo,
  AppView,
} from "./utils/types";

export default function App() {
  const {
    videoRef,
    canvasRef,
    isLoaded,
    isRunning,
    currentExpression,
    error,
    startCamera,
    stopCamera,
  } = useFaceDetection();

  const { cameraStatus, mode, changeMode, shouldScan } = useCameraWatcher();

  const [view, setView] = useState<AppView>("live");
  const [todayData, setTodayData] = useState<DayData | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(loadStreak());
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Track previous shouldScan to detect transitions
  const prevShouldScan = useRef(shouldScan);

  // Auto-activate/deactivate based on video call detection
  useEffect(() => {
    if (mode !== "auto" || !isLoaded) return;

    const wasActive = prevShouldScan.current;
    prevShouldScan.current = shouldScan;

    if (shouldScan && !isRunning && !wasActive) {
      // Video call started → activate
      startCamera();
    } else if (!shouldScan && isRunning && wasActive) {
      // Video call ended → deactivate
      stopCamera();
    }
  }, [shouldScan, isRunning, isLoaded, mode, startCamera, stopCamera]);

  // Persist snapshots
  useEffect(() => {
    if (!currentExpression) return;

    const today = getTodayKey();
    const existing = loadDayData(today) || {
      date: today,
      snapshots: [],
      avgHappiness: 0,
      peakHappiness: 0,
      totalScans: 0,
    };

    if (existing.snapshots.length > 1000) {
      existing.snapshots = existing.snapshots.slice(-800);
    }

    existing.snapshots.push(currentExpression);
    existing.totalScans = existing.snapshots.length;

    const happyValues = existing.snapshots.map(
      (s: ExpressionSnapshot) => s.happy
    );
    existing.avgHappiness =
      happyValues.reduce((a: number, b: number) => a + b, 0) /
      happyValues.length;
    existing.peakHappiness = Math.max(...happyValues);

    saveDayData(existing);
    setTodayData(existing);

    if (existing.totalScans % 60 === 0) {
      setStreak(updateStreak(existing.avgHappiness));
    }
  }, [currentExpression]);

  // Load week data when switching to stats
  useEffect(() => {
    if (view === "stats") {
      setWeekData(getLast7Days());
      setStreak(loadStreak());
    }
  }, [view]);

  // Update tray icon when dominant emotion changes
  const prevDominantEmotion = useRef<string | null>(null);
  useEffect(() => {
    if (!currentExpression || !isRunning) return;

    const scores: [string, number][] = [
      ["happy",     currentExpression.happy],
      ["sad",       currentExpression.sad],
      ["angry",     currentExpression.angry],
      ["surprised", currentExpression.surprised],
      ["fearful",   currentExpression.fearful],
      ["disgusted", currentExpression.disgusted],
      ["neutral",   currentExpression.neutral],
    ];
    const dominant = scores.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    if (dominant === prevDominantEmotion.current) return;
    prevDominantEmotion.current = dominant;

    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("update_tray_icon", { emotion: dominant }))
      .catch(() => {});
  }, [currentExpression, isRunning]);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isRunning, startCamera, stopCamera]);

  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    // Only drag on left mouse button, not on buttons/inputs
    if (e.button !== 0) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging();
    } catch {
      // Not in Tauri (browser dev mode)
    }
  }, []);

  return (
    <div className="app">
      {/* ── Titlebar ── */}
      <div className="titlebar" data-tauri-drag-region onMouseDown={handleDragStart}>
        <div className="titlebar-left">
          <span className="app-icon">☺</span>
          <span className="app-name">HappyFace</span>
          {mode === "auto" && (
            <span className="auto-badge">
              {cameraStatus.camera_in_use ? "● LIVE" : "AUTO"}
            </span>
          )}
        </div>
        <div className="titlebar-right">
          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Einstellungen"
          >
            ⚙
          </button>
          <button
            className={`toggle-btn ${isRunning ? "active" : ""}`}
            onClick={handleToggle}
            disabled={!isLoaded}
          >
            {!isLoaded ? "…" : isRunning ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* ── Settings Dropdown ── */}
      {showSettings && (
        <div className="settings-panel">
          <p className="settings-title">Aktivierungsmodus</p>
          <div className="mode-options">
            {(
              [
                ["auto", "Auto", "Startet bei Video-Calls"],
                ["manual", "Manuell", "Nur per Klick starten"],
                ["always", "Immer", "Dauerhaft aktiv"],
              ] as const
            ).map(([value, label, desc]) => (
              <button
                key={value}
                className={`mode-btn ${mode === value ? "active" : ""}`}
                onClick={() => {
                  changeMode(value);
                  setShowSettings(false);
                }}
              >
                <span className="mode-label">{label}</span>
                <span className="mode-desc">{desc}</span>
              </button>
            ))}
          </div>

          {/* Active apps indicator */}
          {cameraStatus.camera_in_use && (
            <div className="active-apps-info">
              <span className="active-dot" />
              Kamera genutzt von:{" "}
              <strong>{cameraStatus.active_apps.join(", ")}</strong>
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="error-bar">{error}</div>}

      {/* ── Auto-Mode Status Bar ── */}
      {mode === "auto" && !isRunning && !cameraStatus.camera_in_use && (
        <div className="status-bar waiting">
          Warte auf Video-Call… (Zoom, Teams, Meet etc.)
        </div>
      )}
      {mode === "auto" && isRunning && cameraStatus.camera_in_use && (
        <div className="status-bar active">
          Aktiv — {cameraStatus.active_apps.join(", ")}
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="tab-nav">
        {(["live", "timeline", "stats"] as AppView[]).map((v) => (
          <button
            key={v}
            className={`tab-btn ${view === v ? "active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "live" ? "Live" : v === "timeline" ? "Timeline" : "Stats"}
          </button>
        ))}
      </nav>

      {/* ── Video ── always mounted so stream keeps running ── */}
      <div className="video-wrapper" style={{ display: view === "live" ? undefined : "none" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: 320, height: 240, borderRadius: 12 }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 320,
            height: 240,
          }}
        />
      </div>

      {/* ── Gauge ── */}
      {view === "live" && (
        <HappinessGauge
          score={currentExpression?.happy ?? 0}
          isRunning={isRunning}
          expressions={currentExpression}
        />
      )}

      {/* ── Content ── */}
      <div className="content">

        {view === "live" && !currentExpression && !isRunning && (
          <div className="empty-state">
            <span className="empty-icon">
              {mode === "auto" ? "📹" : "👆"}
            </span>
            <p>
              {mode === "auto"
                ? "Starte einen Video-Call — HappyFace aktiviert sich automatisch."
                : "Drücke ▶ um die Analyse zu starten."}
            </p>
          </div>
        )}

        {view === "timeline" && (
          <Timeline snapshots={todayData?.snapshots ?? []} currentExpression={currentExpression} />
        )}

        {view === "stats" && (
          <StatsPanel
            streak={streak}
            todayData={todayData}
            weekData={weekData}
          />
        )}
      </div>
    </div>
  );
}
