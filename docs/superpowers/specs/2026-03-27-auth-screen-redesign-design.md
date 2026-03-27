# Auth-Screen Redesign — Design Spec

**Datum:** 2026-03-27
**Projekt:** TrAction (AGAsDashboard)
**Status:** Approved

---

## Überblick

Redesign des Login/Registrierungs-Screens mit drei Kernänderungen:

1. **TrAction Wordmark** — Premium-Typografie mit Split-Contrast-Styling
2. **DottedSurface Background** — Three.js Animated Dot-Wave als Full-Screen-Hintergrund
3. **Vaporize-Animation** — Canvas-basierte Partikel-Auflösung des Wordmarks nach erfolgreichem Login/Registrierung

Alle Änderungen sind **isoliert auf `templates/modals/auth.html`** und zwei neue JS-Module. `main.js`, `supabase.js` und alle anderen Screens bleiben unberührt.

---

## Tech Stack (Kontext)

| Aspekt | Details |
|--------|---------|
| Framework | Alpine.js 3.15.8 |
| Styling | Tailwind CSS 4 + CSS3 |
| Auth | Supabase (email/password + Google OAuth) |
| Build | Vite |
| Bestehende Animationen | Reine CSS `@keyframes`, keine Animation-Libs |
| Routing | State-driven (kein Router), `appLoaded` Flag steuert App-Ansicht |

---

## 1. Screen-Architektur (Ebenen)

```
┌─────────────────────────────────────────────┐
│ Layer 0 — DottedSurface (Three.js)          │
│   position: fixed, inset: 0, z-index: 0     │
│   pointer-events: none                      │
│   full-screen <canvas> Element              │
├─────────────────────────────────────────────┤
│ Layer 1 — Auth Glass-Card (Alpine.js)       │
│   position: relative, z-index: 10          │
│   backdrop-filter: blur(12px)               │
│   Centered via flex auf dem Viewport        │
├─────────────────────────────────────────────┤
│ Layer 2 — Vaporize Canvas                   │
│   position: fixed, inset: 0, z-index: 20   │
│   Standardmäßig opacity: 0, display: none  │
│   Nur aktiv nach Auth-Success               │
└─────────────────────────────────────────────┘
```

---

## 2. Wordmark-Design

**Schrift:** Plus Jakarta Sans 800 (bereits im Projekt geladen — kein extra Font-Load)
**Größe:** 52px (mobile-first, responsive)
**Letter-spacing:** -2px

**Split-Contrast-Styling:**
- `"Tr"` — Farbe `#555` (gedimmt, tritt zurück)
- `"Action"` — Farbe `#fff` (strahlend, dominiert)

**Divider:** 1px Linie, `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`, Breite 200px

**Tagline:** `TRAIN · TRACK · ACT`
- Font: Plus Jakarta Sans, 9px, `letter-spacing: 6px`, `text-transform: uppercase`
- Farbe: `#4a4a4a`

**Light-Mode-Anpassung:**
- `"Tr"` → `#aaa`
- `"Action"` → `#1a1a1a`
- Divider → `rgba(0,0,0,0.15)`
- Tagline → `#999`

---

## 3. Glass-Card Layout

Die Auth-Card ist vertikal + horizontal zentriert im Viewport (`min-h-screen flex items-center justify-center`).

**Card-Styling:**
- `background: rgba(255,255,255,0.03)`
- `border: 1px solid rgba(255,255,255,0.07)`
- `border-radius: 20px` (`--radius-xl`)
- `backdrop-filter: blur(12px)`
- `padding: 28px 24px`
- Max-Width: `360px`, Width: `100%`, Margin: `16px`

**Card-Inhalt (von oben nach unten):**
1. Wordmark-Block (Schriftzug + Divider + Tagline)
2. Tab-Switcher: "Anmelden" / "Registrieren" (bestehende Alpine-Logik `authMode`)
3. Formularfelder (E-Mail, Passwort — bestehende Validierung unverändert)
4. Primär-Button (Anmelden / Registrieren)
5. "oder"-Divider
6. Google-OAuth-Button
7. Passwort-vergessen-Link (nur im Login-Tab)

Alle bestehenden Alpine-Bindings (`x-model`, `@submit`, Error-States, Loading-States) bleiben 1:1 erhalten.

---

## 4. DottedSurface (Three.js)

**Modul:** `js/fx/dotted-surface.js`
**Integration:** Eigenständiges ES-Modul mit `init(canvas)` / `destroy()` API

**Technische Parameter:**
- Grid: ~40×60 Punkte, `SEPARATION = 150`
- Animation: Sinus-Wellen-Bewegung (Z-Achse)
- Kamera: Perspektivisch, top-down-ish Winkel
- Material: `THREE.PointsMaterial`, Farbe theme-abhängig
- Dark Mode: `color: #ffffff`, `opacity: 0.15`
- Light Mode: `color: #000000`, `opacity: 0.1`
- Theme-Erkennung: `window.matchMedia('(prefers-color-scheme: light)')`

**Lifecycle:**
```js
// Init (in auth.html via x-init)
import { DottedSurface } from './js/fx/dotted-surface.js';
const surface = DottedSurface.init(document.getElementById('bg-canvas'));

// Destroy (via Alpine $destroy / beim Logout)
surface.destroy(); // cancelAnimationFrame + renderer.dispose() + scene cleanup
```

**Performance:**
- `requestAnimationFrame` Loop
- Resize-Handler mit `ResizeObserver`
- Kein Rendering wenn Tab nicht aktiv (`document.hidden` check)

---

## 5. Vaporize-Text-Animation

**Modul:** `js/fx/vaporize-text.js`
**Integration:** Eigenständiges ES-Modul, getriggert nach Auth-Success

**Verhalten:**
- Rendert "TrAction" auf einem Full-Screen-Canvas in identischer Typografie wie der DOM-Wordmark
- Partikel-Auflösung links→rechts
- Weiße Partikel auf transparentem Hintergrund (Dark Mode) / dunkle auf hell (Light Mode)
- `vaporizeDuration`: 1500ms
- `waitDuration`: 500ms (Pause nach Ende der Partikel)
- Einmalig pro Auth-Event — kein Loop

**Technische Parameter:**
- Canvas-Text-Rendering: `font: '800 52px Plus Jakarta Sans'`
- Pixel-Sampling aus Canvas für Partikel-Startpositionen
- Partikel-Physik: Velocity + Spread + Gravity, links→rechts Direction
- Nach `waitDuration`: `onComplete()` Callback wird aufgerufen

**Trigger-Ablauf:**
```
handleLogin() / handleRegister()
  → Supabase API-Response OK
  → authSuccess = true (Alpine State)
  → x-effect: watch authSuccess → VaporizeText.play(canvas, 'TrAction', onComplete)
  → onComplete(): loadAppData() aufrufen
  → Canvas disposen
```

**Wichtig:** `loadAppData()` wird NICHT direkt nach dem API-Call aufgerufen — sondern erst nach dem `onComplete()`-Callback der Animation. Das `appLoaded`-Flag wird wie bisher in `loadAppData()` gesetzt.

---

## 6. Dateien-Übersicht

### Neue Dateien

| Datei | Inhalt |
|-------|--------|
| `js/fx/dotted-surface.js` | Three.js Dot-Wave Modul (init/destroy API) |
| `js/fx/vaporize-text.js` | Canvas Vaporize-Text Modul (play/destroy API) |

### Geänderte Dateien

| Datei | Änderungen |
|-------|-----------|
| `templates/modals/auth.html` | Vollständiges HTML-Redesign: neue Canvas-Elemente, Wordmark-Block, Glass-Card-Struktur, Alpine-refs für Canvas |
| `css/styles.css` | Neue Auth-Card-Styles, Wordmark-Styles, Light/Dark-Mode-Varianten |
| `package.json` | `three` als neue Dependency (`npm install three`) |

### Minimale Änderung in main.js (2 Zeilen pro Handler)

`js/main.js` erhält eine **chirurgische Änderung** in `handleLogin()` und `handleRegister()`:
- Statt direkt `this.loadAppData()` aufzurufen, wird `this.authAnimationPending = true` gesetzt
- `loadAppData()` wird durch den `onComplete`-Callback der Vaporize-Animation aufgerufen
- Alle anderen Teile von `main.js` (Validierung, Error-Handling, Supabase-Calls, `appLoaded`) bleiben 1:1 erhalten

```js
// Vorher (in handleLogin / handleRegister nach API-Success):
await this.loadAppData();

// Nachher:
this.authAnimationPending = true;
// loadAppData() wird von vaporize onComplete() aufgerufen
```

### Unberührte Dateien

- `js/store/supabase.js` — Keinerlei Änderungen
- Alle anderen Templates und Screens

---

## 7. Auth-Flow (vollständig)

```
App-Start
  → initApp() prüft Session
  → Nicht eingeloggt: appLoaded = true, authUser = null
  → Auth-Screen sichtbar (x-show="!authUser")
  → DottedSurface.init() startet (x-init auf Auth-Container)

Login/Registrierung
  → User füllt Formular
  → handleLogin() / handleRegister() aufgerufen
  → Loading-State aktiv (bestehend)
  → Supabase API-Call

Bei Erfolg
  → authSuccess = true
  → VaporizeText.play() getriggert
  → Animation läuft (~2s total)
  → onComplete() → loadAppData()
  → appLoaded = true (Loading-Screen → Dashboard)
  → DottedSurface.destroy() + VaporizeText.destroy()

Bei Fehler
  → authError gesetzt (bestehend)
  → Error-Message angezeigt (bestehend)
  → Kein Animations-Trigger
```

---

## 8. Responsive Breakpoints

| Viewport | Wordmark-Größe | Card-Padding |
|----------|---------------|--------------|
| ≤ 375px  | 44px          | 20px 16px    |
| 376–480px | 52px         | 28px 24px    |
| ≥ 481px  | 52px          | 32px 28px    |

---

## 9. Nicht im Scope

- Änderungen am Onboarding-Modal
- Änderungen an anderen Screens (Health, Training, Habits)
- Push-Notification-Logik
- Service Worker
- Neuer Authentifizierungs-Provider

---

## 10. Abhängigkeiten

- `three` (npm) — für DottedSurface
- Plus Jakarta Sans — bereits geladen (kein neuer Font)
- Kein weiteres npm-Paket erforderlich
