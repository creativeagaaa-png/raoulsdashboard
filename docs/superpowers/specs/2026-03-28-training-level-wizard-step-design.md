# Training Level Wizard-Step — Design Spec

**Datum:** 2026-03-28
**Layout:** 3-Column Grid (wie Goal-Step)
**Position:** Neuer Step 3 (zwischen Equipment und Trainingsziel)

---

## Übersicht

Neuer Wizard-Step, der das Trainings-Level des Users abfragt. Das `trainingLevel`-Feld existiert bereits in `generatorAnswers` (aus Issue 2). Dieser Step liefert die UI dafür.

## Layout

3 gleich große Karten nebeneinander (Grid 3-Spalten):

| Karte | Value | Icon | Titel | Beschreibung |
|-------|-------|------|-------|-------------|
| Links | `beginner` | `ph-plant` | Anfaenger | 0–12 Monate |
| Mitte | `intermediate` | `ph-barbell` | Fortgeschritten | 1–3 Jahre |
| Rechts | `advanced` | `ph-trophy` | Profi | 3+ Jahre |

Aktiver Zustand: `bg-blue-500/10 border-blue-500/25 text-blue-400` (wie alle anderen Steps).

## Step-Nummerierung

Alle bisherigen Steps ab 3 werden um +1 verschoben:

| Alt | Neu | Inhalt |
|-----|-----|--------|
| 1 | 1 | Trainingstage |
| 2 | 2 | Equipment |
| — | **3** | **Training Level (NEU)** |
| 3 | 4 | Trainingsziel |
| 4 | 5 | Muskel-Schwerpunkt |
| 5 | 6 | Andere Sportarten |
| 6 | 7 | Zeit pro Training |
| 7 | 8 | Verletzungen |
| 8 | 9 | Praeferenzen |
| 9 | 10 | Zusammenfassung |
| 10 | 11 | Plan-Preview |

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `templates/modals/training-generator.html` | Neuer Step-Block, alle `x-show` ab Step 3 shiften, Summary erweitern, Progress-Bar Divisor |
| `js/features/training-generator.js` | Validation in `generatorNextStep()`, Step-Referenzen in `generatePlan()` und anderen Methoden |

## Validierung

Step 3 ist required: `if (this.generatorStep === 3 && !a.trainingLevel) return;`

## Rückwärtskompatibilität

`trainingLevel: null` → Fallback `'intermediate'` in `_buildPlan()` bleibt bestehen (für bestehende gespeicherte Antworten ohne Level).
