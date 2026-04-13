import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";
import { ExpressionSnapshot } from "../utils/types";
import { t } from "../i18n";

const INTERVAL_FAST = 33;    // ms — high motion (~30 FPS)
const INTERVAL_SLOW = 500;   // ms — low motion
const MOTION_THRESHOLD = 3;  // % pixel change to count as "motion"

function drawFaceOverlay(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  happyScore: number,
) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const faceSize = Math.max(box.width, box.height);
  const radius = faceSize * 0.58;
  const ringWidth = Math.max(2, faceSize * 0.02);
  const bracketWidth = Math.max(1.5, faceSize * 0.015);
  const bracketLength = Math.max(12, faceSize * 0.12);

  // Color based on happiness
  const green = [46, 234, 160];  // #2eeaa0
  const amber = [251, 191, 36];  // #fbbf24
  const gray  = [148, 163, 184]; // #94a3b8
  let r: number, g: number, b: number;
  if (happyScore > 60) {
    [r, g, b] = green;
  } else if (happyScore > 35) {
    [r, g, b] = amber;
  } else {
    [r, g, b] = gray;
  }

  // Strong glow when happy
  if (happyScore > 40) {
    const glowIntensity = Math.min(1, (happyScore - 40) / 60);

    // Outer soft glow
    ctx.save();
    ctx.globalAlpha = 0.12 + glowIntensity * 0.25;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur = 30 + glowIntensity * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = ringWidth + glowIntensity * Math.max(2, faceSize * 0.02);
    ctx.stroke();
    ctx.restore();

    // Inner glow fill
    if (glowIntensity > 0.3) {
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius + 20);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.7, `rgba(${r},${g},${b},${0.04 + glowIntensity * 0.08})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - radius - 20, cy - radius - 20, (radius + 20) * 2, (radius + 20) * 2);
      ctx.restore();
    }
  }

  // Static circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
  ctx.lineWidth = ringWidth;
  ctx.stroke();

  // Corner brackets
  const bOff = radius * 0.72;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
  ctx.lineWidth = bracketWidth;
  // top-left
  ctx.beginPath();
  ctx.moveTo(cx - bOff, cy - bOff + bracketLength);
  ctx.lineTo(cx - bOff, cy - bOff);
  ctx.lineTo(cx - bOff + bracketLength, cy - bOff);
  ctx.stroke();
  // top-right
  ctx.beginPath();
  ctx.moveTo(cx + bOff - bracketLength, cy - bOff);
  ctx.lineTo(cx + bOff, cy - bOff);
  ctx.lineTo(cx + bOff, cy - bOff + bracketLength);
  ctx.stroke();
  // bottom-left
  ctx.beginPath();
  ctx.moveTo(cx - bOff, cy + bOff - bracketLength);
  ctx.lineTo(cx - bOff, cy + bOff);
  ctx.lineTo(cx - bOff + bracketLength, cy + bOff);
  ctx.stroke();
  // bottom-right
  ctx.beginPath();
  ctx.moveTo(cx + bOff - bracketLength, cy + bOff);
  ctx.lineTo(cx + bOff, cy + bOff);
  ctx.lineTo(cx + bOff, cy + bOff - bracketLength);
  ctx.stroke();
}

function prepareOverlayCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (!width || !height) return null;

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
}

function mapBoxToCoverCanvas(
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  box: { x: number; y: number; width: number; height: number },
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;

  const scale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = (renderedWidth - canvasWidth) / 2;
  const offsetY = (renderedHeight - canvasHeight) / 2;

  return {
    x: box.x * scale - offsetX,
    y: box.y * scale - offsetY,
    width: box.width * scale,
    height: box.height * scale,
  };
}

export function useFaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentIntervalRef = useRef<number>(INTERVAL_FAST);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentExpression, setCurrentExpression] =
    useState<ExpressionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load models
  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoaded(true);
      } catch (err) {
        setError(t("error_models_failed"));
        console.error(err);
      }
    }
    loadModels();
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsRunning(true);
      setError(null);
    } catch {
      setError(t("error_camera_denied"));
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    prevFrameRef.current = null;
    setIsRunning(false);
  }, []);

  // Measure motion by comparing downscaled video frames
  const measureMotion = useCallback((): number => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return 0;

    // Lazy-create a small offscreen canvas for motion comparison
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement("canvas");
      motionCanvasRef.current.width = 64;
      motionCanvasRef.current.height = 48;
    }
    const mc = motionCanvasRef.current;
    const mctx = mc.getContext("2d", { willReadFrequently: true });
    if (!mctx) return 0;

    mctx.drawImage(video, 0, 0, 64, 48);
    const frame = mctx.getImageData(0, 0, 64, 48);

    if (!prevFrameRef.current) {
      prevFrameRef.current = frame;
      return 100; // first frame = treat as high motion
    }

    const prev = prevFrameRef.current.data;
    const curr = frame.data;
    let diffPixels = 0;
    const totalPixels = 64 * 48;

    // Compare every 4th pixel (R channel) for speed
    for (let i = 0; i < curr.length; i += 16) {
      if (Math.abs(curr[i] - prev[i]) > 25) diffPixels++;
    }

    prevFrameRef.current = frame;
    return (diffPixels / (totalPixels / 4)) * 100;
  }, []);

  // Adaptive detection loop
  useEffect(() => {
    if (!isLoaded || !isRunning || !videoRef.current) return;
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;

      // Measure motion and adjust interval
      const motion = measureMotion();
      if (motion > MOTION_THRESHOLD) {
        // Ramp up quickly
        currentIntervalRef.current = INTERVAL_FAST;
      } else {
        // Ease towards slow (don't jump instantly)
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current + 50,
          INTERVAL_SLOW,
        );
      }

      // Run detection
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.5,
            })
          )
          .withFaceLandmarks(true)
          .withFaceExpressions();

        if (detection) {
          const expr = detection.expressions;
          const snapshot: ExpressionSnapshot = {
            timestamp: Date.now(),
            happy: Math.round(expr.happy * 100),
            sad: Math.round(expr.sad * 100),
            angry: Math.round(expr.angry * 100),
            surprised: Math.round(expr.surprised * 100),
            neutral: Math.round(expr.neutral * 100),
            fearful: Math.round(expr.fearful * 100),
            disgusted: Math.round(expr.disgusted * 100),
          };
          setCurrentExpression(snapshot);

          // Draw custom face overlay
          if (canvasRef.current && videoRef.current) {
            const overlay = prepareOverlayCanvas(canvasRef.current);
            if (overlay) {
              const box = mapBoxToCoverCanvas(
                videoRef.current,
                overlay.width,
                overlay.height,
                detection.detection.box,
              );
              if (box) drawFaceOverlay(overlay.ctx, box, snapshot.happy);
            }
          }
        } else if (canvasRef.current) {
          prepareOverlayCanvas(canvasRef.current);
        }
      }

      // Schedule next tick with adaptive interval
      if (!cancelled) {
        timeoutRef.current = window.setTimeout(loop, currentIntervalRef.current);
      }
    };

    loop();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoaded, isRunning, measureMotion]);

  return {
    videoRef,
    canvasRef,
    isLoaded,
    isRunning,
    currentExpression,
    error,
    startCamera,
    stopCamera,
  };
}
