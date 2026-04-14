import { useEffect, useState } from "react";

export type Platform = "macos" | "windows" | "linux" | "unknown";

/** Detect host platform via Tauri command. Falls back to navigator guess. */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const p = await invoke<string>("get_platform");
        setPlatform(p as Platform);
      } catch {
        // Browser dev mode — best-effort fallback
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes("mac")) setPlatform("macos");
        else if (ua.includes("win")) setPlatform("windows");
        else if (ua.includes("linux")) setPlatform("linux");
      }
    })();
  }, []);

  return platform;
}
