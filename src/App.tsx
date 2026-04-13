import { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { useFaceDetection } from "./hooks/useFaceDetection";
import { usePremium } from "./hooks/usePremium";
import { useGamification } from "./hooks/useGamification";
import { HappinessGauge } from "./components/HappinessGauge";
import { Timeline } from "./components/Timeline";
import { UpgradePrompt } from "./components/UpgradePrompt";
import { GamificationOverlay } from "./components/GamificationOverlay";
import {
  loadDayData,
  saveDayData,
  getTodayKey,
  loadStreak,
  updateStreak,
  enforceStorageLimit,
} from "./utils/storage";
import {
  ExpressionSnapshot,
  DayData,
  StreakInfo,
} from "./utils/types";
import { t } from "./i18n";

const ONBOARDING_SEEN_KEY = "happyface_onboarding_seen";
const SHARE_URL = "https://happyface.app";
function formatMinutes(value: number) {
  if (value <= 0) return "0m";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function captureVideoFrame(video: HTMLVideoElement | null) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null);
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

  const {
    isPremium,
    showUpgrade,
    isUpgradeRequired,
    canDismissUpgrade,
    dismissPrompt,
    purchasePremium,
    restorePurchase,
    product,
    storeReady,
    loadingPurchase,
    statusMessage,
  } = usePremium(isRunning);

  const [todayData, setTodayData] = useState<DayData | null>(null);
  const [streak, setStreak] = useState<StreakInfo>(loadStreak());
  const [showSettings, setShowSettings] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_SEEN_KEY) == null;
    } catch {
      return true;
    }
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareStatus, setShareStatus] = useState<string>("");

  const { gamification, toasts, confettiTrigger, dismissToast, resetGamification } = useGamification({
    currentExpression,
    streakCurrent: streak.current,
    isRunning,
  });

  useEffect(() => {
    if (!currentExpression) return;
    const today = getTodayKey();
    const existing = loadDayData(today) || {
      date: today, snapshots: [], avgHappiness: 0, peakHappiness: 0, totalScans: 0,
    };
    if (existing.snapshots.length > 1000) existing.snapshots = existing.snapshots.slice(-800);
    existing.snapshots.push(currentExpression);
    existing.totalScans = existing.snapshots.length;
    const happyValues = existing.snapshots.map((s: ExpressionSnapshot) => s.happy);
    existing.avgHappiness = happyValues.reduce((a: number, b: number) => a + b, 0) / happyValues.length;
    existing.peakHappiness = Math.max(...happyValues);
    saveDayData(existing);
    setTodayData(existing);
    enforceStorageLimit(isPremium);
    if (existing.totalScans % 60 === 0) setStreak(updateStreak(existing.avgHappiness));
  }, [currentExpression, isPremium]);

  useEffect(() => {
    setStreak(loadStreak());
  }, [todayData]);

  const prevDominantEmotion = useRef<string | null>(null);
  useEffect(() => {
    if (!currentExpression || !isRunning) return;
    const scores: [string, number][] = [
      ["happy", currentExpression.happy], ["sad", currentExpression.sad],
      ["angry", currentExpression.angry], ["surprised", currentExpression.surprised],
      ["fearful", currentExpression.fearful], ["disgusted", currentExpression.disgusted],
      ["neutral", currentExpression.neutral],
    ];
    const dominant = scores.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    if (dominant === prevDominantEmotion.current) return;
    prevDominantEmotion.current = dominant;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("update_tray_icon", { emotion: dominant }))
      .catch(() => {});
  }, [currentExpression, isRunning]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleStartLive = useCallback(() => {
    if (isUpgradeRequired) return;
    dismissOnboarding();
    startCamera();
  }, [dismissOnboarding, isUpgradeRequired, startCamera]);

  const handleToggle = useCallback(() => {
    if (!isRunning && isUpgradeRequired) return;
    isRunning ? stopCamera() : handleStartLive();
  }, [handleStartLive, isRunning, isUpgradeRequired, stopCamera]);

  const handleSkipAndStart = useCallback(() => {
    if (!isRunning) handleStartLive();
  }, [handleStartLive, isRunning]);

  useEffect(() => {
    if (isUpgradeRequired && isRunning) {
      stopCamera();
    }
  }, [isRunning, isUpgradeRequired, stopCamera]);

  const handleNextOnboarding = useCallback(() => {
    setOnboardingStep((step) => Math.min(step + 1, 2));
  }, []);

  useEffect(() => {
    return () => {
      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
    };
  }, [shareImageUrl]);

  const downloadBlob = useCallback((blob: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `happyface-${timestamp}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!appRef.current || isCapturing) return;
    setShowSettings(false);
    setShareStatus("");
    setIsCapturing(true);
    try {
      const videoFrame = captureVideoFrame(videoRef.current);
      const canvas = await html2canvas(appRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        onclone: (clonedDocument) => {
          if (!videoFrame) return;
          const clonedVideo = clonedDocument.querySelector<HTMLVideoElement>("[data-capture-source='camera']");
          if (!clonedVideo) return;
          const image = clonedDocument.createElement("img");
          image.src = videoFrame;
          image.className = clonedVideo.className;
          image.setAttribute("style", clonedVideo.getAttribute("style") || "");
          image.alt = t("camera_frame_alt");
          clonedVideo.replaceWith(image);
        },
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Screenshot could not be created.");

      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
      const objectUrl = URL.createObjectURL(blob);
      const file = new File([blob], "happyface-share.png", { type: "image/png" });

      setShareImageUrl(objectUrl);
      setShareFile(file);
      downloadBlob(blob);
      setShareModalOpen(true);
      setShareStatus(t("screenshot_saved"));
    } catch {
      setShareStatus(t("screenshot_failed"));
      setShareModalOpen(true);
    } finally {
      setIsCapturing(false);
    }
  }, [downloadBlob, isCapturing, shareImageUrl, videoRef]);

  const handleSystemShare = useCallback(async () => {
    if (!shareFile || !navigator.share) return;
    try {
      await navigator.share({
        title: t("share_modal_title"),
        text: t("share_text"),
        files: [shareFile],
      });
      setShareStatus(t("shared"));
    } catch {
      setShareStatus(t("share_cancelled"));
    }
  }, [shareFile]);

  const handleCopyImage = useCallback(async () => {
    if (!shareFile || !("ClipboardItem" in window) || !navigator.clipboard?.write) {
      setShareStatus(t("copy_unavailable"));
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [shareFile.type]: shareFile }),
      ]);
      setShareStatus(t("image_copied"));
    } catch {
      setShareStatus(t("copy_failed"));
    }
  }, [shareFile]);

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
    setShareStatus("");
  }, []);

  const showVideo = isRunning;
  const onboardingSteps = [
    {
      kicker: t("onboarding_private_kicker"),
      title: t("onboarding_private_title"),
      body: t("onboarding_private_body"),
      emoji: "🔒",
    },
    {
      kicker: t("onboarding_simple_kicker"),
      title: t("onboarding_simple_title"),
      body: t("onboarding_simple_body"),
      emoji: "📷",
    },
    {
      kicker: t("onboarding_ready_kicker"),
      title: t("onboarding_ready_title"),
      body: t("onboarding_ready_body"),
      emoji: "🏆",
    },
  ] as const;
  const onboarding = onboardingSteps[onboardingStep];
  const isLastOnboardingStep = onboardingStep === onboardingSteps.length - 1;
  const encodedText = encodeURIComponent(`${t("share_text")} ${SHARE_URL}`);
  const canSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const hasSessionData =
    (todayData?.totalScans ?? 0) > 0 ||
    gamification.counters.totalUsageMinutes > 0 ||
    gamification.records.totalHappyMinutes > 0;
  const totalUsageLabel = formatMinutes(gamification.counters.totalUsageMinutes);
  const smilingLabel = formatMinutes(gamification.records.totalHappyMinutes);

  // Enforce 3:4 aspect ratio on resize
  useEffect(() => {
    const RATIO = 3 / 4;
    let resizing = false;
    const onResize = async () => {
      if (resizing) return;
      resizing = true;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const { width } = await win.innerSize();
        const targetHeight = Math.round(width / RATIO);
        await win.setSize(new (await import("@tauri-apps/api/dpi")).LogicalSize(width, targetHeight));
      } catch { /* browser dev mode */ }
      resizing = false;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="app" ref={appRef}>
      {/* ── Full-screen video (always mounted) ── */}
      <div className={`video-fullscreen ${showVideo ? "" : "video-fullscreen--hidden"}`}>
        <video ref={videoRef} playsInline muted className="video-el" data-capture-source="camera" />
        <canvas ref={canvasRef} className="video-canvas" />

        {/* ── Gamification overlays (trophy, events, confetti) ── */}
        <GamificationOverlay
          gamification={gamification}
          streak={streak}
          toasts={toasts}
          confettiTrigger={confettiTrigger}
          onDismissToast={dismissToast}
        />

        {/* ── Top-right controls overlay ── */}
        <div className="controls-overlay">
          <button
            className="settings-btn"
            onClick={handleCapture}
            title={t("screenshot_title")}
            disabled={isCapturing}
          >
            {isCapturing ? "…" : "📸"}
          </button>
          <button
            className={`toggle-btn ${isRunning ? "active" : ""}`}
            onClick={handleToggle}
            disabled={!isLoaded}
          >
            {!isLoaded ? "…" : isRunning ? "⏸" : "▶"}
          </button>
        </div>

        {/* ── Settings dropdown (over video) ── */}
        {showSettings && (
          <div className="settings-overlay">
            <p className="settings-title">{t("settings_title")}</p>
            <p className="settings-copy">{t("settings_copy_live")}</p>
            <button className="reset-btn" onClick={() => { resetGamification(); setShowSettings(false); }}>
              {t("reset_progress")}
            </button>
          </div>
        )}

        {/* ── Bottom overlays: timeline (left) + gauge (right, centered) ── */}
        <div className="bottom-overlays">
          <div className="timeline-overlay">
            <Timeline snapshots={todayData?.snapshots ?? []} currentExpression={currentExpression} />
          </div>
          {isRunning && (
            <div className="gauge-overlay">
              <HappinessGauge
                score={currentExpression?.happy ?? 0}
                isRunning={isRunning}
                expressions={currentExpression}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Non-video state: controls + empty state ── */}
      {!showVideo && !hasSessionData && (
        <>
          <div className="titlebar">
            <div className="titlebar-left">
              <span className="app-icon">☺</span>
              <span className="live-badge">{t("live_mode")}</span>
            </div>
            <div className="titlebar-right">
              <button className="settings-btn" onClick={handleCapture} title={t("screenshot_title")} disabled={isCapturing}>
                {isCapturing ? "…" : "📸"}
              </button>
              <button className={`toggle-btn ${isRunning ? "active" : ""}`} onClick={handleToggle} disabled={!isLoaded}>
                {!isLoaded ? "…" : isRunning ? "⏸" : "▶"}
              </button>
            </div>
          </div>

        </>
      )}

      {!showVideo && !hasSessionData && error && <div className="error-bar">{error}</div>}

      {/* ── Empty state when no video ── */}
      {!showVideo && (
        <div className="content">
          {!hasSessionData && showOnboarding && (
            <div className="onboarding-card onboarding-card--compact">
              <div className="onboarding-header">
                <div>
                  <p className="onboarding-eyebrow">{onboarding.kicker}</p>
                  <h2>{onboarding.title}</h2>
                </div>
                <span className="onboarding-step">{onboardingStep + 1}/{onboardingSteps.length}</span>
              </div>
              <div className="onboarding-slide">
                <span className="onboarding-slide-emoji">{onboarding.emoji}</span>
                <p>{onboarding.body}</p>
              </div>
              <div className="onboarding-actions">
                <button className="onboarding-link" onClick={handleSkipAndStart} disabled={!isLoaded}>
                  {isLoaded ? t("skip_start") : t("loading_short")}
                </button>
                {!isLastOnboardingStep ? (
                  <button className="onboarding-next" onClick={handleNextOnboarding}>
                    {t("next")}
                  </button>
                ) : (
                  <button className="onboarding-play" onClick={handleSkipAndStart} disabled={!isLoaded}>
                    ▶
                  </button>
                )}
              </div>
            </div>
          )}
          {hasSessionData ? (
            <div className="pause-panel">
              <button className="pause-play" onClick={handleStartLive} disabled={!isLoaded}>
                {isLoaded ? "▶" : "…"}
              </button>
              <div className="pause-kpis">
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_total_time")}</span>
                  <span className="pause-kpi-value">{totalUsageLabel}</span>
                </div>
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_smiling_time")}</span>
                  <span className="pause-kpi-value">{smilingLabel}</span>
                </div>
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_today_avg")}</span>
                  <span className="pause-kpi-value">{todayData ? `${Math.round(todayData.avgHappiness)}%` : "—"}</span>
                </div>
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_peak")}</span>
                  <span className="pause-kpi-value">{todayData ? `${todayData.peakHappiness}%` : "—"}</span>
                </div>
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_scans")}</span>
                  <span className="pause-kpi-value">{todayData?.totalScans ?? 0}</span>
                </div>
                <div className="pause-kpi">
                  <span className="pause-kpi-label">{t("kpi_streak")}</span>
                  <span className="pause-kpi-value">{streak.current}d</span>
                </div>
              </div>
              <p className="pause-copy">{t("session_paused")}</p>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">😊</span>
              <p>{t("empty_state_copy")}</p>
              <button className="empty-cta" onClick={handleToggle} disabled={!isLoaded}>
                {isLoaded ? t("start_smiling") : t("loading_camera")}
              </button>
            </div>
          )}
        </div>
      )}

      {showUpgrade && (
        <UpgradePrompt
          prompt={showUpgrade}
          onPurchase={purchasePremium}
          onRestore={restorePurchase}
          onDismiss={dismissPrompt}
          canDismiss={canDismissUpgrade}
          loading={loadingPurchase}
          product={product}
          statusMessage={statusMessage}
          storeReady={storeReady}
        />
      )}

      {shareModalOpen && shareImageUrl && (
        <>
          <div className="share-backdrop" onClick={closeShareModal} />
          <div className="share-modal" role="dialog" aria-modal="true">
            <div className="share-modal-header">
              <div>
                <p className="settings-title">{t("share_modal_title")}</p>
                <p className="share-copy">{t("share_modal_copy")}</p>
              </div>
              <button className="settings-btn" onClick={closeShareModal} title={t("close")}>✕</button>
            </div>
            <img className="share-preview" src={shareImageUrl} alt={t("screenshot_preview_alt")} />
            <div className="share-actions">
              {canSystemShare && shareFile && (
                <button className="share-primary" onClick={handleSystemShare}>{t("system_share")}</button>
              )}
              <button className="share-secondary" onClick={handleCopyImage}>{t("copy_image")}</button>
              <button className="share-secondary" onClick={() => shareFile && downloadBlob(shareFile)}>{t("download")}</button>
            </div>
            <div className="share-platforms">
              <a className="share-chip" href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="share-chip" href={`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(t("share_text"))}`} target="_blank" rel="noreferrer">Telegram</a>
              <a className="share-chip" href={`https://twitter.com/intent/tweet?text=${encodedText}`} target="_blank" rel="noreferrer">X</a>
              <a className="share-chip" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="share-chip" href={`mailto:?subject=${encodeURIComponent(t("share_modal_title"))}&body=${encodedText}`} target="_blank" rel="noreferrer">Email</a>
            </div>
            {shareStatus && <p className="share-status">{shareStatus}</p>}
          </div>
        </>
      )}
    </div>
  );
}
