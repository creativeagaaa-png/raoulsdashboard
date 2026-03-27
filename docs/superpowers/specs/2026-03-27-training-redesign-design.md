# Training Redesign + Consistency Audit — Design Spec

**Datum:** 2026-03-27
**Scope:** Visuelles Redesign der Training-Bereiche + voller Consistency Audit über alle Templates
**Typ:** Rein visuell — keine Funktionsänderungen, keine neuen Dependencies

---

## 1. Training-Modal Redesign (`templates/modals/training.html`)

### Farbschema: Emerald → Blue

Alle Emerald-Akzente im Training-Modal werden durch Blue (`#0a84ff`) ersetzt:

| Element | Alt | Neu |
|---------|-----|-----|
| Nummer-Badge | `bg-emerald-500/15 border-emerald-500/20 text-emerald-400` | `bg-blue-500/12 border-blue-500/20 text-blue-400` |
| Type-Toggle (aktiv) | `bg-emerald-500/15 text-emerald-400 border-emerald-500/30` | `bg-blue-500/15 text-blue-400 border-blue-500/30` |
| Add-Button | `bg-emerald-500/15 text-emerald-400 border-emerald-500/20` | `bg-blue-500/15 text-blue-400 border-blue-500/20` |
| Add-Form Border | `border-emerald-500/20 bg-emerald-500/[0.02]` | `border-blue-500/20 bg-blue-500/[0.02]` |
| Add-Form Label | `text-emerald-400` | `text-blue-400` |
| Today-Highlight (Day Selector) | `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` | `bg-blue-500/10 text-blue-400 border-blue-500/20` |
| Header-Icon | `bg-emerald-500/15 text-emerald-400 border-emerald-500/20` | `bg-blue-500/12 text-blue-400 border-blue-500/20` |

### Übungs-Cards: Grid-basiertes Layout

**Aktuell:** Inline-Inputs mit `text-[11px] w-10 py-0.5` — zu klein für Touch.

**Neu:** Grid-Blöcke mit Labels und großen Werten.

#### Strength (3-Spalten-Grid)
```html
<div class="grid grid-cols-3 gap-2 mt-2.5">
  <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
    <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Sätze</div>
    <input type="number" class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none" placeholder="0">
  </div>
  <!-- Wdh. und Gewicht analog -->
</div>
```

#### Cardio (1-Spalte)
```html
<div class="mt-2.5">
  <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
    <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Dauer</div>
    <input type="text" class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none" placeholder="30 min">
  </div>
</div>
```

#### Distance (2-Spalten-Grid)
```html
<div class="grid grid-cols-2 gap-2 mt-2.5">
  <!-- Distanz | Dauer -->
</div>
```

#### Circuit
- Runden-Anzeige als Grid-Block (wie Strength, 1 Spalte)
- Übungsliste: Inputs vergrößert auf `px-2.5 py-2 text-xs rounded-lg`

### Sprache

- Alle "Add" Buttons → "Hinzufügen"
- "Exercise" Placeholder → "Übung"

### Add-Exercise Form

- Inputs behalten das bestehende Standard-Format (`bg-black/20 rounded-xl px-4 py-3`) — bereits gut
- Nur Farbe und Sprache werden angepasst

---

## 2. Settings-Modal Redesign (`templates/modals/settings.html`)

### Neue Struktur

```
┌─────────────────────────────┐
│ ⚙️ Einstellungen        [×] │
├─────────────────────────────┤
│                             │
│ KONTO                       │
│ ┌─────────────────────────┐ │
│ │ 📧 user@email.de        │ │
│ │    Angemeldet als        │ │
│ ├─────────────────────────┤ │
│ │ 🚪 Abmelden         ›   │ │
│ └─────────────────────────┘ │
│                             │
│ SCHNELLZUGRIFF              │
│ ┌─────────────────────────┐ │
│ │ 🏋 Trainingsplan     ›   │ │
│ ├─────────────────────────┤ │
│ │ 👤 Profil bearbeiten ›   │ │
│ └─────────────────────────┘ │
│                             │
│ GEFAHRENZONE                │
│ [Alle Gewichtseinträge ...]  │
│ [Alle Workouts löschen]      │
│ [Alle Daten löschen]         │
│                             │
├─────────────────────────────┤
│      [ Schließen ]          │
└─────────────────────────────┘
```

### Quick-Link Menu Items

```html
<button class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all text-left">
  <div class="w-8 h-8 rounded-lg bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
    <i class="ph ph-barbell text-sm"></i>
  </div>
  <div class="flex-1">
    <p class="text-sm font-semibold text-white">Trainingsplan</p>
    <p class="text-[10px] text-muted">7-Tage Plan bearbeiten</p>
  </div>
  <i class="ph ph-caret-right text-white/20"></i>
</button>
```

### Konto-Sektion

- E-Mail-Anzeige (read-only, aus `authUser.email`)
- Abmelden-Button als Menu Item mit `ph-sign-out` Icon

### Bestehende Danger Zone

- Bleibt unverändert (bereits gut gestylt mit Rose-Akzent)

---

## 3. Workout-Picker (`templates/modals/workout-picker.html`)

### Farbänderungen

| Element | Alt | Neu |
|---------|-----|-----|
| Start-Button | `bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20` | `bg-[#0a84ff] hover:bg-blue-600 shadow-blue-500/20` |
| Header-Icon | `bg-emerald-500/15 text-emerald-400 border-emerald-500/20` | `bg-blue-500/12 text-blue-400 border-blue-500/20` |
| "Alle" Button | `text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10` | `text-blue-400 hover:text-blue-300 hover:bg-blue-500/10` |

### Semantische Farben bleiben

- Checkbox "selected": `bg-emerald-500` bleibt → semantisch "ausgewählt/erledigt"
- Exercise type badges: Farbcodierung bleibt (Kraft=emerald, Cardio=orange, Distanz=blue, Zirkel=violet)

Hinweis: Da "Kraft" jetzt denselben Emerald-Ton wie "selected" hat, ändere Kraft-Badge → `bg-blue-500/15 text-blue-400` (Training-Akzent).

---

## 4. Training-Tab (`index.html`)

### Übungs-Icons

- `bg-orange-500/12 text-orange-400` → `bg-blue-500/12 text-blue-400`

### Bearbeiten-Button

- Emoji `✏️` → Phosphor Icon:
```html
<i class="ph ph-pencil-simple text-sm"></i> Trainingsplan bearbeiten
```

---

## 5. Workout & History Modals — Token Alignment

### Farbstrategie

- **Training-Kontext** (Header-Icons, Akzent-Elemente) → Blue (`#0a84ff`)
- **Erfolg/Erledigt** (Checkmarks, Fortschrittsbalken, abgeschlossene Sets) → Emerald bleibt

### workout.html

- Header-Icon: Emerald → Blue
- Fortschrittsbalken "completed": Emerald bleibt (semantisch "done")
- Set-Checkmarks: Emerald bleibt

### workout-history.html

- Header-Icon: → Blue
- Session-Detail Akzente: Neutral (bestehend)

---

## 6. Consistency Audit — Alle Templates

### Backdrop

Alle Modals vereinheitlichen:
```
bg-[#050505]/90  →  bg-[var(--backdrop)]
```

**Betroffene Dateien:** training.html, profile.html, settings.html, weight-entry.html

### Border

```
border-white/10  →  border-[var(--glass-border)]
```

**Betroffene Dateien:** training.html, profile.html, settings.html, weight-entry.html (Modal-Container)

### Z-Index

```
weight-entry.html: z-50  →  z-[60]
```

### Padding-Konsistenz

```
workout-picker.html: p-5 → p-6 (Header, Footer, Content px-5 → px-6)
```

### Bottom Navigation

```
text-blue-500  →  text-[var(--accent-training)]
```

Hinweis: Prüfen ob `var()` in Tailwind-`:class` Bindings funktioniert. Falls nicht, `text-[#0a84ff]` als Fallback.

---

## 7. Dateien-Übersicht

| Datei | Änderungstyp |
|-------|-------------|
| `templates/modals/training.html` | Major: Farben + Grid-Layout + Sprache |
| `templates/modals/settings.html` | Major: Neue Sektionen (Konto, Quick-Links) |
| `templates/modals/workout-picker.html` | Minor: Farben + Padding |
| `templates/modals/workout.html` | Minor: Header-Icon Farbe + Token Alignment |
| `templates/modals/workout-history.html` | Minor: Header-Icon Farbe + Token Alignment |
| `templates/modals/weight-entry.html` | Minor: Token Alignment (backdrop, border, z-index) |
| `templates/modals/profile.html` | Minor: Token Alignment (backdrop, border) |
| `index.html` | Minor: Training-Tab Icons + Button + Bottom Nav |
| `css/styles.css` | Keine Änderungen erwartet |

---

## 8. Nicht im Scope

- Keine neuen npm Dependencies
- Keine JavaScript-Logik-Änderungen
- Keine Änderungen an auth.html, bmi-detail.html, confirm.html, toast.html (bereits konsistent oder nicht training-bezogen)
- Keine Änderungen an CSS/Animationen (bestehende Animationen funktionieren gut)
- Kein Dark/Light Mode Toggle (wäre Feature-Arbeit, nicht Redesign)
