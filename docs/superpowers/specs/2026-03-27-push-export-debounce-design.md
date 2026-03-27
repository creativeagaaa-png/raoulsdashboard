# Push-Notifications, CSV-Export & Request-Debouncing — Design Spec

## Ziel

Drei Features für User-Retention und App-Stabilität:
1. **Push-Benachrichtigungen** — Tägliche Erinnerung per Web Push via Supabase Edge Functions
2. **CSV-Export** — Client-seitiger Download der Gewichtsdaten
3. **Request-Debouncing** — Verhindert doppelte DB-Aufrufe bei schnellem Tippen

---

## 1. Push-Benachrichtigungen

### Architektur

- **VAPID-Schlüssel**: Einmalig generiert. Public Key im Frontend (`import.meta.env.VITE_VAPID_PUBLIC_KEY`), Private Key als Supabase Edge Function Secret
- **Service Worker**: Erweitert um `push` und `notificationclick` Event-Handler

### Datenbank

Neue Tabelle `push_subscriptions`:

```sql
CREATE TABLE push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription JSONB NOT NULL,
    reminder_time TEXT NOT NULL DEFAULT '20:00',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_push_subs_reminder ON push_subscriptions (reminder_time) WHERE enabled = true;
```

### Zeitzone

- `reminder_time` wird in **UTC** gespeichert
- Im UI wird die lokale Zeit des Users angezeigt
- Konvertierung passiert client-seitig beim Speichern und Laden:
  - User wählt "20:00" lokal (z.B. CET = UTC+1) → gespeichert als "19:00"
  - Beim Laden: "19:00" UTC → angezeigt als "20:00" lokal
- `Intl.DateTimeFormat().resolvedOptions().timeZone` für Offset-Berechnung

### Frontend (Settings-Modal)

Neuer Bereich "Benachrichtigungen" im Settings-Modal:
- Toggle: Erinnerung aktivieren/deaktivieren
- Time-Picker: Uhrzeit wählen (lokale Zeit, Default 20:00)
- Bei Aktivierung: `Notification.requestPermission()` → `pushManager.subscribe()` → Subscription + Uhrzeit an DB senden
- Bei Deaktivierung: Subscription aus DB löschen
- Status-Text zeigt ob Benachrichtigungen erlaubt/blockiert sind

### Service Worker (`sw.js`)

```javascript
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'TrAction', {
            body: data.body || 'Hast du heute schon gewogen?',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: '/' }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
```

### Edge Function (`send-reminders`)

- Supabase Edge Function in Deno/TypeScript
- Aufgerufen per `pg_cron` **jede volle Stunde**
- Logik:
  1. Ermittle aktuelle UTC-Stunde (z.B. "19:00")
  2. Query: Alle `push_subscriptions` mit `reminder_time` = aktuelle Stunde UND `enabled = true`
  3. Für jeden Subscriber: Prüfe ob `weight_entries` für heute existiert
  4. Wenn nicht: Sende Push-Notification via Web Push Protocol
- Nutzt `web-push` npm-Paket (kompatibel mit Deno)
- VAPID Private Key als Supabase Secret

### pg_cron

```sql
SELECT cron.schedule('send-reminders', '0 * * * *',
    $$SELECT net.http_post(
        url := '<SUPABASE_URL>/functions/v1/send-reminders',
        headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
    );$$
);
```

### Supabase Store (`supabase.js`)

Neue Funktionen:
- `savePushSubscription(subscription, reminderTime)` — Upsert
- `deletePushSubscription()` — Delete
- `getPushSubscription()` — Select für aktuellen User

---

## 2. CSV-Export

### Implementierung

Rein client-seitig, kein Backend nötig.

**Button:** In Settings-Modal, Sektion "Daten". Button "Gewichtsdaten exportieren".

**Logik:**
1. Nimm `this.history` (bereits im Speicher)
2. Generiere CSV-String: `Datum,Gewicht (kg)\n` + Zeilen
3. Erstelle `Blob` mit `text/csv` MIME-Type
4. Erstelle Download-Link via `URL.createObjectURL()`
5. Triggere Download mit Dateiname `traction-gewicht-YYYY-MM-DD.csv`

**Neue Utility:** `js/utils/export.js` mit `exportWeightCSV(history)` Funktion.

---

## 3. Request-Debouncing

### Implementierung

**Neue Utility:** `js/utils/debounce.js`

```javascript
export function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
```

### Anwendung

- `saveSettings()` in `settings.js` — 500ms Debounce
- `saveTrainingPlan()` in `training.js` — 500ms Debounce (markTrainingDirty löst Save aus)
- `upsertCheckin()` Aufrufe — 300ms Debounce

**Nicht debounced:** `addEntry()` (expliziter Button-Klick), `saveWorkoutLog()` (einmaliger Save am Workout-Ende).

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `js/utils/debounce.js` | Neue Datei: debounce Utility |
| `js/utils/export.js` | Neue Datei: CSV-Export Utility |
| `js/store/supabase.js` | Push-Subscription CRUD Funktionen |
| `js/store/settings.js` | Debounce auf saveSettings, Push-Notification UI-State |
| `js/features/training.js` | Debounce auf saveTrainingPlan |
| `js/features/checkin.js` | Debounce auf upsertCheckin |
| `js/main.js` | Push-Notification Logik, Export-Button Handler |
| `sw.js` | Push + notificationclick Event-Handler |
| `templates/modals/settings.html` | Benachrichtigungen-Sektion, Export-Button |
| `supabase/functions/send-reminders/index.ts` | Neue Edge Function |
| `docs/supabase-push-migration.sql` | SQL für push_subscriptions Tabelle + pg_cron |
