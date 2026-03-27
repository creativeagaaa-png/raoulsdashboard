# Training Redesign + Consistency Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visuelles Redesign der Training-Bereiche (Training-Modal, Settings-Modal) und voller Consistency Audit über alle Templates, um Design-Token-Konsistenz und Touch-freundliche Inputs sicherzustellen.

**Architecture:** Rein visuelle Änderungen an HTML-Templates und index.html. Keine JavaScript-Logik-Änderungen. Alle Emerald-Akzente im Training-Kontext werden durch Blue (#0a84ff) ersetzt. Inline-Inputs werden durch Grid-basierte Touch-freundliche Layouts ersetzt. Settings-Modal bekommt Konto- und Quick-Link-Sektionen.

**Tech Stack:** Alpine.js, Tailwind CSS 4.1, Phosphor Icons, HTML Templates

---

### Task 1: Training-Modal — Farben Emerald → Blue

**Files:**
- Modify: `templates/modals/training.html` (lines 23, 43, 61, 179, 188-189, 197, 212, 221-222, 232-233, 243, 266-267)

- [ ] **Step 1: Replace header icon colors**

In `templates/modals/training.html`, line 23, replace:
```html
<div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
```
with:
```html
<div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
```

- [ ] **Step 2: Replace day selector today-highlight**

Line 43, replace:
```html
? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
```
with:
```html
? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
```

- [ ] **Step 3: Replace exercise number badge**

Line 61, replace:
```html
<span class="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold tabular-nums shrink-0" x-text="exIdx + 1"></span>
```
with:
```html
<span class="w-7 h-7 rounded-lg bg-blue-500/12 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold tabular-nums shrink-0" x-text="exIdx + 1"></span>
```

- [ ] **Step 4: Replace add-exercise toggle button colors**

Line 179, replace:
```html
:class="trainingShowAddForm ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-white/10 bg-white/[0.02] text-muted hover:border-white/20 hover:text-white'">
```
with:
```html
:class="trainingShowAddForm ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-white/10 bg-white/[0.02] text-muted hover:border-white/20 hover:text-white'">
```

- [ ] **Step 5: Replace add-exercise form border and label**

Line 188, replace:
```html
class="p-4 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] transition-all duration-300 mb-4">
```
with:
```html
class="p-4 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/[0.02] transition-all duration-300 mb-4">
```

Line 189, replace:
```html
<p class="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-3">Neue Übung</p>
```
with:
```html
<p class="text-[10px] text-blue-400 uppercase tracking-widest font-bold mb-3">Neue Übung</p>
```

- [ ] **Step 6: Replace type toggle active state**

Line 197, replace:
```html
:class="trainingNewExercise.type === t.id ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-muted border-white/5 hover:bg-white/10'"
```
with:
```html
:class="trainingNewExercise.type === t.id ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-white/5 text-muted border-white/5 hover:bg-white/10'"
```

- [ ] **Step 7: Replace all "Add" buttons with "Hinzufügen" and blue colors**

Lines 211-214 (strength add), replace:
```html
<button @click="addExercise()"
        class="w-full py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Add
</button>
```
with:
```html
<button @click="addExercise()"
        class="w-full py-2.5 rounded-xl bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Hinzufügen
</button>
```

Lines 220-223 (cardio add), replace:
```html
<button @click="addExercise()"
        class="py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Add
</button>
```
with:
```html
<button @click="addExercise()"
        class="py-2.5 rounded-xl bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Hinzufügen
</button>
```

Lines 232-234 (distance add), replace:
```html
<button @click="addExercise()"
        class="py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Add
</button>
```
with:
```html
<button @click="addExercise()"
        class="py-2.5 rounded-xl bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Hinzufügen
</button>
```

- [ ] **Step 8: Replace circuit label and add button**

Line 243, replace:
```html
<p class="text-[10px] text-emerald-400/70 uppercase tracking-wider font-bold">Übungen im Zirkel:</p>
```
with:
```html
<p class="text-[10px] text-blue-400/70 uppercase tracking-wider font-bold">Übungen im Zirkel:</p>
```

Lines 265-268 (circuit add button), replace:
```html
<button @click="addExercise()"
        class="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Add
</button>
```
with:
```html
<button @click="addExercise()"
        class="px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40 active:scale-95 transition-all">
    <i class="ph ph-plus"></i> Hinzufügen
</button>
```

- [ ] **Step 9: Fix English placeholders**

Line 126, replace `placeholder="Exercise"` with `placeholder="Übung"`.
Line 128, replace `placeholder="Reps"` with `placeholder="Wdh."`.
Line 132, replace `placeholder="Time"` with `placeholder="Zeit"`.

In new exercise circuit form:
Line 254, replace `placeholder="Time"` with `placeholder="Zeit"`.

- [ ] **Step 10: Replace backdrop and border tokens**

Line 6, replace:
```html
<div class="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl"
```
with:
```html
<div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
```

Line 12, replace:
```html
<div class="bg-surface border border-white/10 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```
with:
```html
<div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```

- [ ] **Step 11: Commit**

```bash
git add templates/modals/training.html
git commit -m "style: Training-Modal Farben von Emerald zu Blue, Sprache zu Deutsch, Design Tokens"
```

---

### Task 2: Training-Modal — Grid Layout für Übungs-Inputs

**Files:**
- Modify: `templates/modals/training.html` (lines 74-144, exercise input sections)

- [ ] **Step 1: Replace strength inline inputs with grid layout**

Replace lines 74-92 (the entire strength input section):
```html
<!-- Strength: Sets x Reps + Weight -->
<div x-show="(ex.type || 'strength') === 'strength'" class="flex items-center gap-2 mt-1.5 flex-wrap">
    <div class="flex items-center gap-1">
        <input type="number" x-model="ex.sets" @input="markTrainingDirty()"
               class="w-10 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="0">
        <span class="text-[10px] text-muted">Sätze</span>
    </div>
    <span class="text-white/10">x</span>
    <div class="flex items-center gap-1">
        <input type="text" x-model="ex.reps" @input="markTrainingDirty()"
               class="w-14 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="0">
        <span class="text-[10px] text-muted">Wdh.</span>
    </div>
    <div class="flex items-center gap-1">
        <input type="number" inputmode="decimal" step="0.5" x-model="ex.weight" @input="markTrainingDirty()"
               class="w-14 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="–">
        <span class="text-[10px] text-muted">kg</span>
    </div>
</div>
```
with:
```html
<!-- Strength: Sets x Reps + Weight -->
<div x-show="(ex.type || 'strength') === 'strength'" class="grid grid-cols-3 gap-2 mt-2.5">
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Sätze</div>
        <input type="number" x-model="ex.sets" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="0">
    </div>
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Wdh.</div>
        <input type="text" x-model="ex.reps" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="0">
    </div>
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Gewicht</div>
        <input type="number" inputmode="decimal" step="0.5" x-model="ex.weight" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="–">
    </div>
</div>
```

- [ ] **Step 2: Replace cardio inline input with grid block**

Replace lines 93-100 (cardio section):
```html
<!-- Cardio: Duration -->
<div x-show="ex.type === 'cardio'" class="flex items-center gap-3 mt-1.5">
    <div class="flex items-center gap-1">
        <input type="text" x-model="ex.duration" @input="markTrainingDirty()"
               class="w-20 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="30 min">
        <span class="text-[10px] text-muted">Dauer</span>
    </div>
</div>
```
with:
```html
<!-- Cardio: Duration -->
<div x-show="ex.type === 'cardio'" class="mt-2.5">
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Dauer</div>
        <input type="text" x-model="ex.duration" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="30 min">
    </div>
</div>
```

- [ ] **Step 3: Replace distance inline inputs with grid**

Replace lines 101-113 (distance section):
```html
<!-- Distance: Distance + Duration -->
<div x-show="ex.type === 'distance'" class="flex items-center gap-3 mt-1.5">
    <div class="flex items-center gap-1">
        <input type="text" x-model="ex.distance" @input="markTrainingDirty()"
               class="w-14 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="5">
        <span class="text-[10px] text-muted">km</span>
    </div>
    <div class="flex items-center gap-1">
        <input type="text" x-model="ex.duration" @input="markTrainingDirty()"
               class="w-20 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="30 min">
        <span class="text-[10px] text-muted">Dauer</span>
    </div>
</div>
```
with:
```html
<!-- Distance: Distance + Duration -->
<div x-show="ex.type === 'distance'" class="grid grid-cols-2 gap-2 mt-2.5">
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Distanz</div>
        <input type="text" x-model="ex.distance" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="5 km">
    </div>
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Dauer</div>
        <input type="text" x-model="ex.duration" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="30 min">
    </div>
</div>
```

- [ ] **Step 4: Replace circuit rounds input and exercise list inputs**

Replace lines 114-144 (circuit section):
```html
<!-- Circuit: Rounds + Exercises list (editable) -->
<div x-show="ex.type === 'circuit'" class="mt-1.5">
    <div class="flex items-center gap-1 mb-1.5">
        <input type="number" x-model="ex.rounds" @input="markTrainingDirty()"
               class="w-10 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[11px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="3">
        <span class="text-[10px] text-muted">Runden</span>
    </div>
    <div x-show="ex.circuitExercises && ex.circuitExercises.length > 0" class="space-y-1 mt-1">
        <template x-for="(ce, ceIdx) in (ex.circuitExercises || [])" :key="ceIdx">
            <div class="flex items-center gap-1">
                <span class="w-3 text-center text-white/30 text-[10px] shrink-0" x-text="ceIdx + 1"></span>
                <input type="text" x-model="ce.name" @input="markTrainingDirty()"
                       class="flex-1 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-white/20 min-w-0" placeholder="Übung">
                <input type="text" x-model="ce.reps" @input="markTrainingDirty()"
                       class="w-10 bg-white/5 border border-white/5 rounded-md px-1 py-0.5 text-[10px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="Wdh.">
                <input type="number" inputmode="decimal" step="0.5" x-model="ce.weight" @input="markTrainingDirty()"
                       class="w-10 bg-white/5 border border-white/5 rounded-md px-1 py-0.5 text-[10px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="kg">
                <input type="text" x-model="ce.duration" @input="markTrainingDirty()"
                       class="w-12 bg-white/5 border border-white/5 rounded-md px-1 py-0.5 text-[10px] text-center text-white font-mono focus:outline-none focus:border-white/20" placeholder="Zeit">
                <button @click="ex.circuitExercises.splice(ceIdx, 1); markTrainingDirty()" x-show="ex.circuitExercises.length > 1"
                        class="p-0.5 text-muted hover:text-rose-400 transition-colors shrink-0">
                    <i class="ph ph-x text-[10px]"></i>
                </button>
            </div>
        </template>
    </div>
    <button type="button" @click="ex.circuitExercises.push({name:'',reps:'',duration:'',weight:''}); markTrainingDirty()"
            class="mt-1 w-full py-1 rounded-md border border-dashed border-white/10 text-[9px] text-muted hover:text-white hover:border-white/20 transition-all">
        <i class="ph ph-plus text-[9px]"></i> Übung
    </button>
</div>
```
with:
```html
<!-- Circuit: Rounds + Exercises list (editable) -->
<div x-show="ex.type === 'circuit'" class="mt-2.5">
    <div class="bg-black/20 rounded-xl p-2.5 text-center border border-white/5 mb-2">
        <div class="text-[9px] text-muted uppercase tracking-wider mb-1">Runden</div>
        <input type="number" x-model="ex.rounds" @input="markTrainingDirty()"
               class="w-full bg-transparent border-none text-center text-base font-bold text-white font-mono focus:outline-none placeholder-white/15" placeholder="3">
    </div>
    <div x-show="ex.circuitExercises && ex.circuitExercises.length > 0" class="space-y-1.5 mt-2">
        <template x-for="(ce, ceIdx) in (ex.circuitExercises || [])" :key="ceIdx">
            <div class="flex items-center gap-1.5">
                <span class="w-4 text-center text-white/30 text-[10px] shrink-0" x-text="ceIdx + 1"></span>
                <input type="text" x-model="ce.name" @input="markTrainingDirty()"
                       class="flex-1 bg-black/20 border border-white/5 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white/20 min-w-0 transition-colors" placeholder="Übung">
                <input type="text" x-model="ce.reps" @input="markTrainingDirty()"
                       class="w-12 bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-xs text-center text-white font-mono focus:outline-none focus:border-white/20 transition-colors" placeholder="Wdh.">
                <input type="number" inputmode="decimal" step="0.5" x-model="ce.weight" @input="markTrainingDirty()"
                       class="w-12 bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-xs text-center text-white font-mono focus:outline-none focus:border-white/20 transition-colors" placeholder="kg">
                <input type="text" x-model="ce.duration" @input="markTrainingDirty()"
                       class="w-14 bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-xs text-center text-white font-mono focus:outline-none focus:border-white/20 transition-colors" placeholder="Zeit">
                <button @click="ex.circuitExercises.splice(ceIdx, 1); markTrainingDirty()" x-show="ex.circuitExercises.length > 1"
                        class="p-1 text-muted hover:text-rose-400 transition-colors shrink-0">
                    <i class="ph ph-x text-xs"></i>
                </button>
            </div>
        </template>
    </div>
    <button type="button" @click="ex.circuitExercises.push({name:'',reps:'',duration:'',weight:''}); markTrainingDirty()"
            class="mt-2 w-full py-1.5 rounded-lg border border-dashed border-white/10 text-[10px] text-muted hover:text-white hover:border-white/20 transition-all">
        <i class="ph ph-plus text-xs"></i> Übung hinzufügen
    </button>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add templates/modals/training.html
git commit -m "style: Training-Modal Grid-Layout für Touch-freundliche Übungs-Inputs"
```

---

### Task 3: Settings-Modal — Neue Sektionen

**Files:**
- Modify: `templates/modals/settings.html` (complete content section rewrite, lines 32-53)

- [ ] **Step 1: Add Konto and Quick-Links sections above Danger Zone**

Replace lines 32-53 (the `overflow-y-auto` content div):
```html
<div class="overflow-y-auto p-6 space-y-8 custom-scrollbar">
    <section>
        <h3 class="text-xs font-bold text-rose-400/80 uppercase tracking-widest mb-4">Gefahrenzone</h3>
        <div class="space-y-3">
            <button type="button" @click="clearAllEntries()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-trash text-sm"></i>
                Alle Gewichtseinträge löschen
            </button>
            <button type="button" @click="clearAllWorkouts()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-barbell text-sm"></i>
                Alle Workouts löschen
            </button>
            <button type="button" @click="resetData()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-warning text-sm"></i>
                Alle Daten löschen (Zurücksetzen)
            </button>
        </div>
    </section>
</div>
```
with:
```html
<div class="overflow-y-auto p-6 space-y-6 custom-scrollbar">
    <!-- Konto -->
    <section>
        <h3 class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Konto</h3>
        <div class="rounded-2xl border border-[var(--glass-border)] overflow-hidden">
            <div class="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--glass-border)]">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted border border-white/5">
                    <i class="ph ph-envelope text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-white truncate" x-text="authUser?.email || '–'"></p>
                    <p class="text-[10px] text-muted">Angemeldet als</p>
                </div>
            </div>
            <button type="button" @click="handleLogout(); closeSettings()"
                    class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all text-left">
                <div class="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                    <i class="ph ph-sign-out text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-white">Abmelden</p>
                </div>
                <i class="ph ph-caret-right text-white/20"></i>
            </button>
        </div>
    </section>

    <!-- Schnellzugriff -->
    <section>
        <h3 class="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Schnellzugriff</h3>
        <div class="rounded-2xl border border-[var(--glass-border)] overflow-hidden">
            <button type="button" @click="openTraining(); closeSettings()"
                    class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all text-left border-b border-[var(--glass-border)]">
                <div class="w-8 h-8 rounded-lg bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <i class="ph ph-barbell text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-white">Trainingsplan</p>
                    <p class="text-[10px] text-muted">7-Tage Plan bearbeiten</p>
                </div>
                <i class="ph ph-caret-right text-white/20"></i>
            </button>
            <button type="button" @click="openProfile(); closeSettings()"
                    class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all text-left">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted border border-white/5">
                    <i class="ph ph-user text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-white">Profil bearbeiten</p>
                    <p class="text-[10px] text-muted">Gewicht, Größe, Ziele</p>
                </div>
                <i class="ph ph-caret-right text-white/20"></i>
            </button>
        </div>
    </section>

    <!-- Gefahrenzone -->
    <section>
        <h3 class="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-3">Gefahrenzone</h3>
        <div class="space-y-3">
            <button type="button" @click="clearAllEntries()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-trash text-sm"></i>
                Alle Gewichtseinträge löschen
            </button>
            <button type="button" @click="clearAllWorkouts()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-barbell text-sm"></i>
                Alle Workouts löschen
            </button>
            <button type="button" @click="resetData()"
                    class="w-full py-3.5 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-xs hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                <i class="ph ph-warning text-sm"></i>
                Alle Daten löschen (Zurücksetzen)
            </button>
        </div>
    </section>
</div>
```

- [ ] **Step 2: Replace backdrop and border tokens**

Line 6, replace:
```html
<div class="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl"
```
with:
```html
<div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
```

Line 11, replace:
```html
<div class="bg-surface border border-white/10 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```
with:
```html
<div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```

- [ ] **Step 3: Commit**

```bash
git add templates/modals/settings.html
git commit -m "style: Settings-Modal mit Konto, Schnellzugriff und Design Tokens"
```

---

### Task 4: Index.html — Training Tab + Bottom Nav + Quick Menu

**Files:**
- Modify: `index.html` (lines 344, 407, 811, 840, 846, 869-873)

- [ ] **Step 1: Replace exercise icons in training tab**

Line 344, replace:
```html
<div class="w-9 h-9 rounded-[10px] bg-orange-500/12 flex items-center justify-center text-orange-400 shrink-0">
```
with:
```html
<div class="w-9 h-9 rounded-[10px] bg-blue-500/12 flex items-center justify-center text-blue-400 shrink-0">
```

- [ ] **Step 2: Replace edit button emoji with icon**

Lines 407-409, replace:
```html
<button @click="openTraining()" class="inline-flex items-center gap-1.5 text-muted text-xs px-5 py-2.5 rounded-xl border border-white/[0.06] hover:bg-white/5 transition-all cursor-pointer">
    ✏️ Trainingsplan bearbeiten
</button>
```
with:
```html
<button @click="openTraining()" class="inline-flex items-center gap-1.5 text-muted text-xs px-5 py-2.5 rounded-xl border border-white/[0.06] hover:bg-white/5 transition-all cursor-pointer">
    <i class="ph ph-pencil-simple text-sm"></i> Trainingsplan bearbeiten
</button>
```

- [ ] **Step 3: Fix bottom nav training tab color to use accent token**

Line 811, replace:
```html
:class="activeTab === 'training' ? 'text-blue-500' : 'text-gray-400'">
```
with:
```html
:class="activeTab === 'training' ? 'text-[#0a84ff]' : 'text-gray-400'">
```

- [ ] **Step 4: Replace quick menu training button colors from emerald to blue**

Lines 870-872, replace:
```html
<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 relative group-active:scale-90 transition-transform">
    <i class="ph-bold ph-barbell text-lg text-emerald-400"></i>
    <span x-show="!isRestDay" class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface animate-pulse" aria-hidden="true"></span>
```
with:
```html
<div class="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0 relative group-active:scale-90 transition-transform">
    <i class="ph-bold ph-barbell text-lg text-blue-400"></i>
    <span x-show="!isRestDay" class="absolute -top-1 -right-1 w-3 h-3 bg-[#0a84ff] rounded-full border-2 border-surface animate-pulse" aria-hidden="true"></span>
```

- [ ] **Step 5: Fix quick menu backdrop token**

Line 840, replace:
```html
<div class="absolute inset-0 bg-[#050505]/80 backdrop-blur-md"
```
with:
```html
<div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-md"
```

Line 846, replace:
```html
<div class="bg-surface border border-white/10 rounded-t-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
```
with:
```html
<div class="bg-surface border border-[var(--glass-border)] rounded-t-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: Training Tab Icons, Bottom Nav und Quick Menu Design Tokens"
```

---

### Task 5: Workout Modals — Farben + Token Alignment

**Files:**
- Modify: `templates/modals/workout-picker.html` (lines 25-26, 44, 70, 112)
- Modify: `templates/modals/workout.html` (lines 22, 25, 275)
- Modify: `templates/modals/workout-history.html` (no changes needed — already uses design tokens and indigo accent)

- [ ] **Step 1: Workout Picker — Header icon emerald → blue**

In `templates/modals/workout-picker.html`, line 25, replace:
```html
<div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
```
with:
```html
<div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
```

- [ ] **Step 2: Workout Picker — "Alle" button color**

Line 44, replace:
```html
class="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10">
```
with:
```html
class="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10">
```

- [ ] **Step 3: Workout Picker — Kraft badge color**

Line 70, replace:
```html
'bg-emerald-500/15 text-emerald-400': (ex.type || 'strength') === 'strength',
```
with:
```html
'bg-blue-500/15 text-blue-400': (ex.type || 'strength') === 'strength',
```

- [ ] **Step 4: Workout Picker — Start button color**

Line 112, replace:
```html
class="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:pointer-events-none"
```
with:
```html
class="flex-1 py-3.5 rounded-xl bg-[#0a84ff] text-white font-bold text-xs hover:bg-blue-600 active:scale-[0.97] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-30 disabled:pointer-events-none"
```

- [ ] **Step 5: Workout Picker — Padding p-5 → p-6**

Line 22, replace `class="p-5 border-b` with `class="p-6 border-b`.
Line 40, replace `class="overflow-y-auto flex-1 px-5 py-4` with `class="overflow-y-auto flex-1 px-6 py-4`.
Line 107, replace `class="p-5 border-t` with `class="p-6 border-t`.

- [ ] **Step 6: Workout Modal — Header icon emerald → blue**

In `templates/modals/workout.html`, line 25, replace:
```html
<div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
```
with:
```html
<div class="w-9 h-9 rounded-xl bg-blue-500/12 flex items-center justify-center text-blue-400 border border-blue-500/20">
```

- [ ] **Step 7: Workout Modal — Padding p-5 → p-6**

Line 22, replace `class="p-5 border-b` with `class="p-6 border-b`.
Line 53, replace `class="overflow-y-auto flex-1 px-5 py-4` with `class="overflow-y-auto flex-1 px-6 py-4`.
Line 275, replace `class="p-5 border-t` with `class="p-6 border-t`.

- [ ] **Step 8: Commit**

```bash
git add templates/modals/workout-picker.html templates/modals/workout.html
git commit -m "style: Workout Modals Farben und Padding-Konsistenz"
```

---

### Task 6: Remaining Modals — Token Alignment

**Files:**
- Modify: `templates/modals/weight-entry.html` (lines 2, 7, 13)
- Modify: `templates/modals/profile.html` (lines 6, 11)

- [ ] **Step 1: Weight Entry — z-index and tokens**

In `templates/modals/weight-entry.html`:

Line 2, replace `z-50` with `z-[60]`:
```html
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-mobile-sheet"
```
→
```html
<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-mobile-sheet"
```

Line 7, replace backdrop:
```html
<div class="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl"
```
→
```html
<div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
```

Line 13, replace border:
```html
<div class="bg-surface border border-white/10 rounded-3xl w-full max-w-sm p-8 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
```
→
```html
<div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-sm p-8 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
```

- [ ] **Step 2: Profile — tokens**

In `templates/modals/profile.html`:

Line 6 (approx), replace backdrop:
```html
<div class="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl"
```
→
```html
<div class="absolute inset-0 bg-[var(--backdrop)] backdrop-blur-xl"
```

Line 11 (approx), replace border:
```html
<div class="bg-surface border border-white/10 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```
→
```html
<div class="bg-surface border border-[var(--glass-border)] rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
```

- [ ] **Step 3: Commit**

```bash
git add templates/modals/weight-entry.html templates/modals/profile.html
git commit -m "style: Weight Entry und Profil Modal Token-Alignment"
```

---

### Task 7: Visual Verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/raoulagachi/Codes/AGAsDashboard && npm run dev
```

- [ ] **Step 2: Verify Training Modal**

Open the app, navigate to Training tab, click "Trainingsplan bearbeiten":
- Header icon should be blue, not green
- Day selector today-highlight should be blue
- Exercise number badges should be blue
- Strength inputs should show grid blocks (Sätze | Wdh. | Gewicht)
- Add button should say "Hinzufügen", not "Add"
- All circuit placeholders should be German

- [ ] **Step 3: Verify Settings Modal**

Click avatar → Einstellungen:
- Should show Konto section with email
- Should show Schnellzugriff with Trainingsplan and Profil links
- Danger Zone should be unchanged
- Clicking "Trainingsplan" should close settings and open training modal

- [ ] **Step 4: Verify Workout Picker**

Navigate to Training tab, start a workout:
- Header icon should be blue
- "Alle" button should be blue
- Kraft badge should be blue (not emerald)
- Start button should be blue
- Selected checkmarks should still be emerald (semantic "selected")

- [ ] **Step 5: Verify Bottom Nav + Quick Menu**

- Training tab active color should be #0a84ff
- Quick menu training item should be blue, not emerald
- Quick menu backdrop should respect dark/light mode

- [ ] **Step 6: Verify Token Consistency**

- Open Weight Entry modal — backdrop should blur correctly in both modes
- Open Profile modal — same check
- All modals should have consistent z-index (z-[60])

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "style: Finale Fixes nach visueller Verifikation"
```
