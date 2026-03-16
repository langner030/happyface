import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";
import { ExpressionSnapshot } from "../utils/types";

const SCAN_INTERVAL = 100; // 100ms

export function useFaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
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
        setError("Modelle konnten nicht geladen werden.");
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
      setError("Kamera-Zugriff verweigert.");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Detection loop
  useEffect(() => {
    if (!isLoaded || !isRunning || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

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

        // Draw on canvas
        if (canvasRef.current && videoRef.current) {
          const dims = faceapi.matchDimensions(
            canvasRef.current,
            videoRef.current,
            true
          );
          const resized = faceapi.resizeResults(detection, dims);
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
            faceapi.draw.drawDetections(canvasRef.current, resized);
          }
        }
      }
    };

    // Run immediately, then on interval
    detect();
    intervalRef.current = window.setInterval(detect, SCAN_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoaded, isRunning]);

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
