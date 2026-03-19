// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// Track whether the window has been positioned initially.
static INITIAL_POSITIONED: AtomicBool = AtomicBool::new(false);

/// Known video call apps and their process names
const VIDEO_CALL_APPS: &[(&str, &str)] = &[
    ("zoom.us", "Zoom"),
    ("Microsoft Teams", "Teams"),
    ("Teams", "Teams"),
    ("FaceTime", "FaceTime"),
    ("Webex", "Webex"),
    ("Slack Helper", "Slack"),
    ("Discord", "Discord"),
    ("Google Chrome", "Meet/Chrome"),
    ("Arc", "Meet/Arc"),
    ("Safari", "Meet/Safari"),
    ("Firefox", "Meet/Firefox"),
    ("Skype", "Skype"),
    ("Around", "Around"),
    ("Loom", "Loom"),
    ("obs", "OBS"),
    ("Photo Booth", "Photo Booth"),
];

#[derive(Clone, Serialize)]
struct CameraStatus {
    camera_in_use: bool,
    active_apps: Vec<String>,
    auto_mode: bool,
}

/// Generate a 22×22 RGBA circle icon for the given emotion.
/// No external image files required — pixels are computed at runtime.
fn create_emotion_icon(emotion: &str) -> Image<'static> {
    let size: u32 = 22;
    let cx = 11.0_f32;
    let cy = 11.0_f32;
    let r = 8.5_f32;

    // Emotion → RGB color
    let (rc, gc, bc): (u8, u8, u8) = match emotion {
        "happy"     => (0x34, 0xd3, 0x99), // emerald
        "sad"       => (0x60, 0xa5, 0xfa), // blue
        "angry"     => (0xf8, 0x71, 0x71), // red
        "surprised" => (0xa7, 0x8b, 0xfa), // purple
        "fearful"   => (0xfb, 0xbf, 0x24), // amber
        "disgusted" => (0x86, 0xef, 0xac), // light green
        _           => (0x94, 0xa3, 0xb8), // neutral gray
    };

    let mut data: Vec<u8> = Vec::with_capacity((size * size * 4) as usize);
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            // Anti-aliased edge
            let alpha: u8 = if dist <= r - 1.0 {
                255
            } else if dist <= r {
                ((r - dist) * 255.0) as u8
            } else {
                0
            };
            data.push(rc);
            data.push(gc);
            data.push(bc);
            data.push(alpha);
        }
    }

    Image::new_owned(data, size, size)
}

/// Called from frontend to update the tray icon to match current dominant emotion.
#[tauri::command]
fn update_tray_icon(emotion: String, app: tauri::AppHandle) {
    if let Some(tray) = app.tray_by_id("main") {
        let icon = create_emotion_icon(&emotion);
        let _ = tray.set_icon(Some(icon));

        let tooltip = match emotion.as_str() {
            "happy"     => "HappyFace — 😊 Happy",
            "sad"       => "HappyFace — 😢 Sad",
            "angry"     => "HappyFace — 😠 Angry",
            "surprised" => "HappyFace — 😲 Surprised",
            "fearful"   => "HappyFace — 😨 Fearful",
            "disgusted" => "HappyFace — 🤢 Disgusted",
            _           => "HappyFace — 😐 Neutral",
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[cfg(target_os = "macos")]
fn detect_camera_usage() -> (bool, Vec<String>) {
    let mut active_apps: Vec<String> = Vec::new();

    let camera_active = ["VDCAssistant", "AppleCameraAssistant"]
        .iter()
        .any(|proc| {
            Command::new("pgrep")
                .args(["-x", proc])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        });

    if !camera_active {
        return (false, active_apps);
    }

    if let Ok(output) = Command::new("ps").args(["-eo", "comm="]).output() {
        let processes = String::from_utf8_lossy(&output.stdout);
        for (proc_name, display_name) in VIDEO_CALL_APPS {
            if processes.lines().any(|line| line.contains(proc_name)) {
                let name = display_name.to_string();
                if !active_apps.contains(&name) {
                    active_apps.push(name);
                }
            }
        }
    }

    if active_apps.is_empty() {
        active_apps.push("Kamera aktiv (unbekannte App)".to_string());
    }

    (true, active_apps)
}

#[cfg(not(target_os = "macos"))]
fn detect_camera_usage() -> (bool, Vec<String>) {
    (false, vec![])
}

#[tauri::command]
fn check_camera_status() -> CameraStatus {
    let (in_use, apps) = detect_camera_usage();
    CameraStatus {
        camera_in_use: in_use,
        active_apps: apps,
        auto_mode: true,
    }
}

#[tauri::command]
fn get_video_call_apps() -> Vec<String> {
    VIDEO_CALL_APPS
        .iter()
        .map(|(_, name)| name.to_string())
        .collect::<Vec<_>>()
        .into_iter()
        .fold(Vec::new(), |mut acc, name| {
            if !acc.contains(&name) {
                acc.push(name);
            }
            acc
        })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_iap::init())
        .invoke_handler(tauri::generate_handler![
            check_camera_status,
            get_video_call_apps,
            update_tray_icon
        ])
        .setup(|app| {
            // ── Tray Icon ──
            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("HappyFace")
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event: TrayIconEvent| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();

                                // Only position on first show; after that let user drag freely
                                if !INITIAL_POSITIONED.load(Ordering::Relaxed) {
                                    INITIAL_POSITIONED.store(true, Ordering::Relaxed);
                                    if let Ok(Some(monitor)) = window.primary_monitor() {
                                        let size = monitor.size();
                                        let scale = monitor.scale_factor();
                                        let w = 380.0_f64;
                                        let x = (size.width as f64 / scale) - w - 12.0;
                                        let _ = window.set_position(tauri::Position::Logical(
                                            tauri::LogicalPosition::new(x, 32.0),
                                        ));
                                    }
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // ── Camera Watcher Thread ──
            let app_handle = app.handle().clone();
            let was_active = Arc::new(AtomicBool::new(false));

            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(3));

                let (in_use, apps) = detect_camera_usage();
                let prev = was_active.load(Ordering::Relaxed);

                if in_use != prev {
                    was_active.store(in_use, Ordering::Relaxed);
                    let _ = app_handle.emit(
                        "camera-status-changed",
                        CameraStatus {
                            camera_in_use: in_use,
                            active_apps: apps,
                            auto_mode: true,
                        },
                    );
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
