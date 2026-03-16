import { useEffect, useState, useCallback } from "react";

interface CameraStatus {
  camera_in_use: boolean;
  active_apps: string[];
  auto_mode: boolean;
}

type AutoActivateMode = "auto" | "manual" | "always";

/**
 * Listens for camera-status-changed events from the Rust backend.
 * Provides the current camera status and auto-activation mode.
 *
 * In "auto" mode, HappyFace starts/stops scanning based on whether
 * another app (Zoom, Teams, etc.) is using the camera.
 */
export function useCameraWatcher() {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    camera_in_use: false,
    active_apps: [],
    auto_mode: true,
  });
  const [mode, setMode] = useState<AutoActivateMode>(() => {
    try {
      return (localStorage.getItem("happyface_mode") as AutoActivateMode) || "auto";
    } catch {
      return "auto";
    }
  });

  // Listen for Tauri events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setup() {
      try {
        // Dynamic import so it doesn't crash in browser dev mode
        const { listen } = await import("@tauri-apps/api/event");
        const unlistenFn = await listen<CameraStatus>(
          "camera-status-changed",
          (event) => {
            setCameraStatus(event.payload);
          }
        );
        unlisten = unlistenFn;
      } catch {
        // Not running in Tauri (e.g. browser dev), ignore
        console.log("Camera watcher: Not in Tauri environment");
      }
    }

    setup();
    return () => unlisten?.();
  }, []);

  // Initial check on mount
  useEffect(() => {
    async function initialCheck() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke<CameraStatus>("check_camera_status");
        setCameraStatus(status);
      } catch {
        // Not in Tauri
      }
    }
    initialCheck();
  }, []);

  // Persist mode preference
  const changeMode = useCallback((newMode: AutoActivateMode) => {
    setMode(newMode);
    try {
      localStorage.setItem("happyface_mode", newMode);
    } catch {
      // ignore
    }
  }, []);

  // Determine if scanning should be active
  const shouldScan =
    mode === "always" ||
    mode === "manual" ||
    (mode === "auto" && cameraStatus.camera_in_use);

  return {
    cameraStatus,
    mode,
    changeMode,
    shouldScan,
  };
}
