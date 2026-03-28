# Optimized Prompt — AI Training Plan Generator

**Detected:** Feature Development + UI Development + Testing | **Target:** Claude Code | **Effort:** /effort max | **Cheatsheet Workflow:** A (Feature Dev, 6 Steps)

---

## The Prompt (copy-paste into Claude Code):

```
/effort max

## Context

This is "AGAsDashboard" — a fitness tracking Progressive Web App built with:
- Alpine.js (reactive state via mixins), Vite (build tool), Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Edge Functions)
- Chart.js for visualizations, Phosphor Icons
- Deployed on Netlify (netlify.toml present, SPA redirect configured)
- All UI text is in German (de)

The app already has a fully functional MANUAL training plan system:
- File: js/features/training.js (trainingMixin) — CRUD for exercises by weekday
- File: templates/modals/training.html — modal UI with day selector, exercise forms
- File: js/store/supabase.js — all database operations (training_plan table)
- 4 exercise types: strength (sets x reps + weight), cardio (duration), distance (distance + duration), circuit (rounds + exercises)
- 7-day weekly structure (Mo-Su), exercise ordering, dirty-state tracking

The app stores extensive user data that MUST be leveraged for AI plan generation:
- settings table: start_weight, goal_weight, user_height, user_age, gender, activity_level, weekly_goal_rate, goal_date
- weight_entries table: daily weight logs with trends
- daily_checkins table: training, steps, calories, water, sleep habits
- workout_logs table: completed workout sessions with exercises performed
- training_plan table: current manual training plan (if any)

There is currently NO AI/LLM integration in the app.

## Task

Implement a dual-path training plan creation flow: when the user opens the training plan modal, they choose between "Manuellen Trainingsplan hinzufuegen" (existing manual flow) and "Lass dir einen Trainingsplan erstellen" (new AI-powered flow).

### Step 1: Selection Screen
Add an initial selection screen BEFORE the current training modal content:
- Two prominent, visually appealing cards/buttons:
  1. "Manuellen Trainingsplan hinzufuegen" — icon: Notepad/Edit — opens the existing manual training plan editor as-is
  2. "Lass dir einen Trainingsplan erstellen" — icon: Sparkle/Magic — opens the new AI questionnaire widget
- If the user already has a training plan saved, show a warning that generating a new one will replace the existing plan (with confirm dialog)

### Step 2: AI Questionnaire Widget
When the user selects the AI path, show a multi-step questionnaire form (wizard-style, one question per step with progress indicator). The widget MUST ask these questions:

1. "Wie ist dein aktuelles Fitnesslevel?" — Options: Anfaenger / Fortgeschritten / Profi (radio buttons with descriptions)
2. "Wie oft pro Woche moechtest du trainieren?" — Slider or number picker (1-7 days)
3. "Hast du ein Fitnessstudio zur Verfuegung?" — Options: Ja (Geraete + Freihantel) / Nur Freihantel/Home-Gym / Nur Calisthenics/Bodyweight (radio with icons)
4. "Was ist dein primaeres Trainingsziel?" — Options: Muskelaufbau / Fettabbau / Ausdauer / Allgemeine Fitness (chips/toggles, allow multi-select)
5. "Machst du noch eine andere Sportart diese Woche?" — Text input + frequency (e.g., "Fussball, 2x pro Woche") or "Nein, nur diesen Trainingsplan"
6. "Wie viel Zeit hast du pro Trainingseinheit?" — Options: 30 Min / 45 Min / 60 Min / 90+ Min
7. "Gibt es Verletzungen oder Einschraenkungen?" — Optional text input or "Keine"
8. "Bevorzugst du bestimmte Uebungen oder moechtest du welche vermeiden?" — Optional text input

### Step 3: AI Plan Generation
After the questionnaire is complete:
- Collect ALL user answers from the questionnaire
- Fetch ALL existing user data from Supabase: profile/settings (weight, height, age, gender, activity_level, goals), recent weight trends, workout history (what exercises they've done before, performance data), current checkin streaks
- Send everything to a Supabase Edge Function that calls an AI API (use OpenAI GPT-4o or Claude API — choose whichever is more practical for a Supabase Edge Function). The Edge Function:
  - Receives: questionnaire answers + full user profile + workout history
  - Constructs a detailed system prompt for training plan generation
  - Returns a structured JSON training plan matching the existing training_plan table schema: array of { day, exercise_name, exercise_type, sets, reps, weight, duration, distance, rounds, circuit_exercises, order }
- Show a loading animation with motivational text while generating (e.g., "Dein personalisierter Trainingsplan wird erstellt...")
- Display the generated plan in a preview screen where the user can review each day
- "Plan uebernehmen" button saves to Supabase (replaces existing training_plan entries)
- "Nochmal generieren" button re-runs generation with same inputs
- "Anpassen" button switches to manual editor with the generated plan pre-loaded

### Step 4: Supabase Edge Function
Create a new Edge Function at supabase/functions/generate-training-plan/index.ts:
- Accept POST with { questionnaire: {...}, userProfile: {...}, workoutHistory: [...] }
- Validate input, sanitize user data
- Construct AI prompt that produces a structured weekly training plan
- Parse AI response into the exact schema needed for the training_plan table
- Return { success: true, plan: [...] } or { success: false, error: "..." }
- Include rate limiting (max 3 generations per user per day)
- Store the API key as a Supabase secret (never expose to frontend)

### Step 5: Browser Mockup
After the feature is fully implemented, create a standalone HTML file called `mockup-trainingsplan-ai.html` in the project root that visually demonstrates the complete new user flow:
- Selection screen (manual vs. AI)
- Questionnaire wizard (all 8 steps)
- Loading/generation animation
- Plan preview screen
- Use Tailwind CDN + inline styles to match the app's dark theme aesthetic
- Make it interactive (clicking through steps works) — pure HTML/CSS/JS, no build required
- This is for visual review only, not production code

use context7

## Requirements

- Preserve ALL existing manual training plan functionality — zero regressions
- The selection screen must feel native to the existing app design (dark theme, rounded cards, Phosphor icons, German text)
- Questionnaire must be mobile-first, touch-friendly, with smooth transitions between steps
- Back-navigation in the questionnaire wizard (user can go back and change answers)
- Progress indicator (step X of 8) visible at all times during questionnaire
- Generated plan must use the EXACT same data structure as manually created plans so the rest of the app (workout picker, workout execution, history) works seamlessly
- Edge Function must handle AI API errors gracefully with user-friendly German error messages
- All new Alpine.js state must follow the existing mixin pattern (create a new mixin or extend trainingMixin)
- Environment variable for AI API key must be documented in a .env.example update

## Claude Code Workflow

### Recommended Sequence:
1. /superpowers:brainstorm — Think through all edge cases: What if user has no data yet? What if AI returns malformed JSON? What if the plan has exercises the app doesn't support? What about the circuit exercise type?
2. "use context7" — Load current Alpine.js docs, Supabase Edge Functions docs, Tailwind v4 docs
3. /superpowers:write-plan — Create detailed implementation plan with test cases for each component
4. /superpowers:execute-plan — Execute in TDD batches: write tests first, then implementation
5. Playwright MCP — Verify the complete user flow on localhost (selection > questionnaire > generation > preview > save)
6. /security-review — Check Edge Function for injection, API key exposure, rate limiting

### Context7 Docs to Load:
- "use context7" for Alpine.js reactive data and x-show/x-transition directives
- /context7:docs supabase edge functions deno
- /context7:docs tailwind css v4

### Testing Strategy:
- Unit tests (Vitest): questionnaire state management, data aggregation logic, AI response parsing, plan schema validation
- Integration tests: Edge Function request/response cycle, Supabase data fetching for AI context
- E2E tests (Playwright): Full user flow from selection screen through plan generation and saving
- Edge case tests: empty user profile, no workout history, AI API timeout, malformed AI response, network errors
- Regression tests: Ensure manual training plan flow is completely untouched

## Cheatsheet Power Tips

1. "Schreib erst die Tests, dann den Code" — Use /superpowers:tdd for each component (questionnaire widget, Edge Function, plan preview). Tests define the contract before implementation.
2. "Nutze Subagenten fuer die Suche im Codebase" — The existing training.js, supabase.js, and workout.js have patterns to follow. Use subagents to find all existing patterns for modal creation, mixin structure, and Supabase operations.
3. /effort max — This is a complex multi-component feature spanning frontend (Alpine.js widget), backend (Edge Function), and AI integration. Maximum thinking effort is essential.
4. "use context7" at every step — Alpine.js directives (x-show, x-transition, x-for), Supabase Edge Function patterns, and Tailwind v4 utility classes must use current documentation, not memorized patterns.
5. /compact after the brainstorm phase — The brainstorm will generate a lot of context. Compress with focus on "training plan AI generation implementation" before starting the execute-plan phase.

## Output Format

- New/modified files should follow the existing project structure:
  - js/features/training.js (extend or create training-ai.js mixin)
  - templates/modals/training.html (add selection screen + questionnaire)
  - supabase/functions/generate-training-plan/index.ts (new Edge Function)
  - js/store/supabase.js (add data aggregation function for AI context)
  - mockup-trainingsplan-ai.html (standalone mockup in project root)
  - .env.example (update with AI API key variable)
  - tests/ (new test files for all new components)
- All code must match existing style: no TypeScript on frontend, German comments where existing code uses German, consistent naming conventions
- After ALL implementation and tests pass, do NOT push to git. I will test manually via `netlify dev` first and push manually.

## Quality Standards

- All Vitest tests pass (npm run test)
- Playwright E2E tests verify the complete flow on localhost
- /security-review passes with no critical findings
- /diff shows clean, reviewable changes
- Manual training plan flow works exactly as before (zero regressions)
- Edge Function handles all error cases gracefully
- Generated plan integrates seamlessly with existing workout picker and workout execution
- The standalone mockup HTML file opens in browser and demonstrates the full flow visually
```

---

**Key optimizations applied:** Transformed a rough German description into a structured 5-step implementation with exact file paths from your codebase, leveraged all user data tables for AI context, added the full Superpowers Workflow A (brainstorm > write-plan > execute-plan), included comprehensive testing strategy with Vitest + Playwright, and embedded Context7 docs loading for Alpine.js, Supabase Edge Functions, and Tailwind v4. The /effort max setting and /security-review ensure maximum quality for this complex multi-component feature.
