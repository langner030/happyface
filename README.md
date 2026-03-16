<p align="center">
  <img src="landing/app-screenshot.png" alt="HappyFace" width="420">
</p>

<h1 align="center">☺ HappyFace</h1>

<p align="center">
  <strong>Lächeln ist gut für deine Gesundheit.</strong><br>
  Echtzeit-Emotionserkennung als macOS Menubar-App — lokal, privat, wissenschaftlich fundiert.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#wissenschaft">Wissenschaft</a> •
  <a href="#installation">Installation</a> •
  <a href="#download">Download</a>
</p>

---

## Das Problem

Im HomeOffice fehlt der soziale Spiegel. Niemand sagt dir, dass du seit Stunden die Stirn runzelst. Studien zeigen: Unbewusst negative Mimik verstärkt negative Emotionen — ein Teufelskreis, der Cortisol erhöht und die Produktivität senkt.

## Die Lösung

**HappyFace** sitzt unsichtbar in deiner macOS-Menubar und analysiert deine Mimik in Echtzeit — sanft, privat und ohne dich zu stören. Ein farbiger Punkt zeigt dir live, wie es dir geht:

- 🟢 **Grün** — Du strahlst. Weiter so.
- 🟡 **Gelb** — Neutral. Zeit für eine Mikropause?
- 🔴 **Rot** — Angespannt. Atme bewusst durch.

## Features

| | Feature | Beschreibung |
|---|---|---|
| ⚡ | **Live-Erkennung** | Echtzeit-Analyse deiner Mimik — bis zu 10× pro Sekunde |
| 📈 | **Timeline** | Stimmungsverlauf über 60s, 60min, 24h oder 7 Tage |
| 🎯 | **Smart Tray-Icon** | Menubar-Icon wechselt live die Farbe je nach Emotion |
| 😊 | **Multi-Emotion** | Trackt 7 Emotionen: Happy, Sad, Angry, Surprised, Fearful, Disgusted, Neutral |
| 🔥 | **Streak-Tracker** | Tage in Folge mit positivem Durchschnitt |
| 💡 | **Smart Nudges** | Motivations-Tipps bei negativer Stimmung |
| 📊 | **Statistiken** | Tages-Durchschnitt, Peak, 7-Tage-Übersicht |
| 🔒 | **100% Lokal** | Keine Cloud, keine Server, keine Daten die dein Gerät verlassen |

## Wissenschaft

Die Verbindung zwischen Gesichtsausdruck, Emotionen und Gesundheit ist wissenschaftlich gut belegt:

- **Facial Feedback Hypothese** — Lächeln beeinflusst direkt, wie wir Emotionen erleben. Bestätigt in einer Mega-Studie mit 3.878 Teilnehmenden ([Nature Human Behaviour, 2022](https://www.nature.com/articles/s41562-022-01458-9))
- **+13% Produktivität** — Zufriedene Mitarbeitende arbeiten messbar produktiver ([Oxford Saïd Business School](https://www.ox.ac.uk/news/2019-10-24-happy-workers-are-13-more-productive))
- **Weniger Cortisol** — Echtes Lächeln senkt den Cortisolspiegel und stärkt das Immunsystem ([PubMed, Soussignan 2002](https://pubmed.ncbi.nlm.nih.gov/12899366/))

## Tech Stack

| Technologie | Zweck |
|---|---|
| [Tauri 2](https://v2.tauri.app) | Leichtgewichtige Desktop-App (~15MB statt 200MB+ Electron) |
| [face-api.js](https://github.com/nicedayfrankly/face-api.js) | Expression Detection mit Tiny-Modellen (~800KB) |
| React 18 + TypeScript | Frontend |
| Recharts | Timeline-Visualisierung |
| Vite 6 | Build Tool |
| Rust | Backend (Tray-Icon, Window Management) |

## Installation

### Voraussetzungen

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) ≥ 18
- macOS 13+ (Kamera-Berechtigung erforderlich)

### Development

```bash
# Dependencies installieren
npm install

# face-api.js Modelle herunterladen
npm run download-models

# Dev-Modus starten (Vite + Tauri)
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

Das erzeugt `HappyFace.app` und `HappyFace.dmg` in `src-tauri/target/release/bundle/`.

### Kamera-Berechtigung

Beim ersten Start fragt macOS nach Kamera-Zugriff. Falls abgelehnt:
**System Settings → Privacy & Security → Camera → HappyFace aktivieren**

## Architektur

```
happyface/
├── src/                        # React Frontend
│   ├── components/
│   │   ├── HappinessGauge.tsx  # SVG Ring-Gauge + Mini-Emotion-Circles
│   │   ├── Timeline.tsx        # Multi-Range Recharts Timeline
│   │   └── StatsPanel.tsx      # Streak, Stats, Week Bars
│   ├── hooks/
│   │   ├── useFaceDetection.ts # Kamera + face-api.js (100ms Intervall)
│   │   └── useCameraWatcher.ts # Video-Call Detection
│   ├── utils/
│   │   ├── types.ts            # TypeScript Types
│   │   └── storage.ts          # LocalStorage Persistence
│   ├── App.tsx                 # Main App + Tray Icon Updates
│   └── styles.css              # Dark Theme
├── src-tauri/                  # Tauri Backend (Rust)
│   ├── src/main.rs             # Dynamic Tray Icon + Window
│   ├── tauri.conf.json         # App Config
│   └── Entitlements.plist      # macOS Camera Entitlement
├── landing/                    # Marketing Landing Page
│   └── index.html              # Standalone HTML
└── public/models/              # face-api.js Modelle (~800KB)
```

## Datenschutz

- **Alles lokal** — Keine Daten verlassen dein Gerät
- **Kein Cloud** — Kein Account, kein Server, keine Registrierung
- **Kamera-Frames** bleiben im Browser-Kontext, werden nie gespeichert
- **Nur Scores** werden in LocalStorage persistiert

## Ressourcenverbrauch

| Metrik | Wert |
|---|---|
| RAM | ~80–120 MB |
| CPU | ~2–5% bei 100ms Intervall |
| App-Größe | ~15 MB |
| Modelle | ~800 KB |

## Download

> **[→ Zum neuesten Release](https://github.com/langner030/happyface/releases/latest)**

Lade die `.dmg`-Datei herunter, öffne sie und ziehe HappyFace in deinen Programme-Ordner.

---

<p align="center">
  Made with ☺ in Germany 🇩🇪
</p>
