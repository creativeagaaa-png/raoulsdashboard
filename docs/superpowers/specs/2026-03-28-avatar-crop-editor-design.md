# Avatar Crop-Editor — Design Spec

**Datum:** 2026-03-28
**Status:** Genehmigt

## Zusammenfassung

Nach Auswahl eines Profilbilds oeffnet sich ein Fullscreen Crop-Overlay (Instagram-Stil) mit kreisfoermiger Maske. Der User positioniert das Bild per Drag und Pinch-to-Zoom. Beim Bestaetigen wird das Bild client-seitig auf 512x512px zugeschnitten und als JPEG hochgeladen.

## Ablauf

1. User klickt "Bild aendern" im Profil-Modal — Datei-Picker oeffnet sich
2. Nach Bildauswahl (bestehende Validierung: JPEG/PNG/WebP, max 5 MB, Magic-Bytes-Check) oeffnet sich das Crop-Overlay
3. User positioniert das Bild per Drag und zoomt per Pinch-to-Zoom (Touch) bzw. Mausrad (Desktop)
4. Kreisfoermige Maske zeigt den sichtbaren Bereich, Rest ist abgedunkelt
5. "Abbrechen" schliesst den Editor ohne Upload, "Uebernehmen" schneidet zu und laedt hoch

## Crop-Overlay UI

- Fullscreen-Overlay mit `z-[80]` (ueber dem Profil-Modal bei z-[60])
- Dunkler Hintergrund (`bg-[#050505]/95 backdrop-blur-xl`)
- Bild zentriert im Viewport
- Kreisfoermige transparente Maske, ca. 280px Durchmesser auf Mobile
- Umliegender Bereich abgedunkelt (CSS-Overlay mit `border-radius: 50%` Cutout oder Canvas-Rendering)
- Zoom-Slider unterhalb des Bildes als alternative Eingabemethode
- Footer mit zwei Buttons:
  - Links: "Abbrechen" (border-style, text-muted)
  - Rechts: "Uebernehmen" (bg-white text-black, primaer)
- Design konsistent mit bestehenden Modals (bg-surface, border-white/10, rounded-2xl)

## Technische Umsetzung

### Keine externe Abhaengigkeit

Reines Canvas + Touch/Mouse-Events. Kein Cropper.js o.ae. — haelt das Bundle klein und vermeidet Kompatibilitaetsprobleme.

### Neue Dateien

- `js/features/avatar-crop.js` — Alpine.js Mixin mit der gesamten Crop-Logik
- `templates/modals/avatar-crop.html` — Overlay-Template (wird per `?raw` Import geladen)

### Crop-Logik (avatar-crop.js)

**State:**
- `cropOpen: false` — Overlay sichtbar
- `cropImage: null` — HTMLImageElement des geladenen Bildes
- `cropZoom: 1` — Aktueller Zoom-Faktor (min: berechnet damit Bild Kreis fuellt, max: 3)
- `cropOffsetX: 0, cropOffsetY: 0` — Aktuelle Verschiebung in Pixeln
- `cropFile: null` — Original-File-Referenz fuer Fallback
- `cropProcessing: false` — Ladeindikator waehrend Canvas-Export + Upload

**Methoden:**
- `openCropEditor(file)` — Laedt Bild als Image-Element, berechnet initiale Zoom-Grenzen, oeffnet Overlay
- `onCropPointerDown/Move/Up(e)` — Drag-Handling (Pointer Events fuer Touch + Mouse)
- `onCropPinch(e)` — Pinch-to-Zoom via Touch-Events (berechnet Distanz zwischen zwei Fingern)
- `onCropWheel(e)` — Mausrad-Zoom
- `updateCropZoom(value)` — Zoom setzen (vom Slider), Offset clampen
- `clampOffset()` — Stellt sicher, dass der sichtbare Kreis immer vom Bild gefuellt ist
- `drawCropPreview()` — Zeichnet Bild + Overlay-Maske auf das Preview-Canvas (requestAnimationFrame Loop)
- `applyCrop()` — Offscreen-Canvas 512x512, `drawImage()` mit aktuellem Offset/Zoom, `toBlob('image/jpeg', 0.85)`, ruft bestehenden Upload-Flow auf
- `cancelCrop()` — Schliesst Overlay, raeumt State auf
- `initCropCanvas()` — Setzt Canvas-Groesse, startet Render-Loop
- `destroyCropCanvas()` — Stoppt Render-Loop, gibt Ressourcen frei

### Canvas-Rendering

Das Preview-Canvas zeigt:
1. Das Bild mit aktuellem Zoom und Offset
2. Ein halbtransparentes schwarzes Overlay ueber dem gesamten Canvas
3. Einen kreisfoermigen Ausschnitt (clear) in der Mitte — zeigt das Bild darunter

Technik: `globalCompositeOperation = 'destination-out'` fuer den Kreis-Cutout.

### Integration in bestehenden Code

**`js/store/settings.js` — `handleAvatarUpload()`:**
Statt direkt `uploadAvatar()` aufzurufen, wird nach erfolgreicher Validierung `this.openCropEditor(file)` aufgerufen.

**`js/main.js`:**
Import und Spread des neuen `avatarCropMixin`.

**`index.html`:**
Import des neuen Templates via `?raw` und Injection wie bei anderen Modals.

### Crop-Berechnung beim Export

```
// Pseudo-Code
const canvas = new OffscreenCanvas(512, 512);
const ctx = canvas.getContext('2d');
const circleRadius = previewCircleRadius; // in Preview-Pixeln
const scale = 512 / (circleRadius * 2);

ctx.drawImage(
    image,
    (cropOffsetX - circleCenter.x + circleRadius) * scale * (1/cropZoom) ... ,
    // Mapping von Preview-Koordinaten auf 512x512 Output
);
```

Die exakte Mapping-Berechnung wird bei der Implementierung finalisiert — das Prinzip ist: der sichtbare Kreis-Ausschnitt wird 1:1 auf das 512x512 Canvas gemappt.

## Touch-Optimierungen (iPhone PWA)

- `touch-action: none` auf dem Canvas-Element (verhindert Safari-Scroll und Browser-Zoom)
- Pointer Events API als primaerer Input-Handler (vereinheitlicht Touch + Mouse)
- Separate Touch-Event-Listener fuer Pinch-to-Zoom (braucht zwei Finger)
- Min-Zoom dynamisch berechnet: Bild muss den Kreis immer komplett fuellen
- Max-Zoom: 3x
- Offset wird nach jedem Zoom-Schritt geclampt (kein leerer Bereich im Kreis)
- `will-change: transform` auf dem Canvas fuer GPU-Beschleunigung

## Ausgabe

- Format: JPEG
- Qualitaet: 0.85
- Groesse: 512x512 Pixel
- Geschaetzte Dateigroesse: 40-80 KB
- Wird als Blob an den bestehenden `uploadAvatar()` Flow uebergeben

## Barrierefreiheit

- Overlay hat `role="dialog"` und `aria-modal="true"`
- trapFocus auf dem Overlay aktiv
- Zoom-Slider ist per Tastatur bedienbar
- Buttons haben klare Labels
- Escape-Taste schliesst den Editor
