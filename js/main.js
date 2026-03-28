import Alpine from 'alpinejs';
import { Chart, registerables } from 'chart.js';

import { DEFAULT_PROFILE, WEEKDAYS, WEEKDAY_SHORT, ACTIVITY_LEVELS } from './utils/constants.js';
import { getTodayWeekdayIndex, getLocalDateString } from './utils/formatting.js';
import { calculateBMI, calculateTrend, calculateOracle, getBMIRanges } from './utils/analytics.js';
import * as Supa from './store/supabase.js';
import { settingsMixin } from './store/settings.js';
import { trainingMixin } from './features/training.js';
import { trainingGeneratorMixin } from './features/training-generator.js';
import { workoutMixin } from './features/workout.js';
import { restTimerMixin } from './features/rest-timer.js';
import { caloriesMixin } from './features/calories.js';
import { checkinMixin } from './features/checkin.js';
import { weightAnalysisMixin } from './features/weight-analysis.js';
import { weeklyReportMixin } from './features/weekly-report.js';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning, hapticSelection } from './utils/haptics.js';
import { registerSwipeDismiss } from './utils/swipe-dismiss.js';
import { exportWeightCSV } from './utils/export.js';

// Modal templates (loaded as raw HTML via Vite)
import bmiDetailModal from '../templates/modals/bmi-detail.html?raw';
import settingsModal from '../templates/modals/settings.html?raw';
import trainingModal from '../templates/modals/training.html?raw';
import trainingGeneratorModal from '../templates/modals/training-generator.html?raw';
import profileModal from '../templates/modals/profile.html?raw';
import weightEntryModal from '../templates/modals/weight-entry.html?raw';
import confirmModal from '../templates/modals/confirm.html?raw';
import toastComponent from '../templates/modals/toast.html?raw';
import workoutModal from '../templates/modals/workout.html?raw';
import workoutHistoryModal from '../templates/modals/workout-history.html?raw';
import workoutPickerModal from '../templates/modals/workout-picker.html?raw';
import authScreen from '../templates/modals/auth.html?raw';
import onboardingModal from '../templates/modals/onboarding.html?raw';
import { DottedSurface } from './fx/dotted-surface.js';
import { VaporizeText } from './fx/vaporize-text.js';

Chart.register(...registerables);

// Inject modal templates into the DOM before Alpine initializes
const modalsContainer = document.getElementById('modals');
if (modalsContainer) {
    modalsContainer.innerHTML = [
        authScreen,
        onboardingModal,
        bmiDetailModal,
        settingsModal,
        trainingModal,
        trainingGeneratorModal,
        profileModal,
        weightEntryModal,
        confirmModal,
        toastComponent,
        workoutModal,
        workoutHistoryModal,
        workoutPickerModal
    ].join('\n');
}

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function app() {
    let chartInstance = null;

    return {
        // --- BASE STATE ---
        startWeight: DEFAULT_PROFILE.startWeight,
        goalWeight: DEFAULT_PROFILE.goalWeight,
        goalDate: null,
        userHeight: DEFAULT_PROFILE.userHeight,
        userAge: DEFAULT_PROFILE.userAge,
        gender: null,
        activityLevel: 'moderately_active',
        weeklyGoalRate: 0,
        checklistItems: [...DEFAULT_PROFILE.checklistItems],

        history: [],
        chartFilter: '1M',

        // Auth State
        authReady: false,
        authUser: null,
        authMode: 'login',
        authEmail: '',
        authPassword: '',
        authShowPassword: false,
        authLoading: false,
        authError: '',
        authSuccess: '',
        authAnimationPending: false,
        dottedSurface: null,

        // Display Name & Avatar
        displayName: '',
        avatarUrl: '',

        // Onboarding
        onboardingOpen: false,
        onboardingMode: 'full', // 'full' = new user, 'name_only' = existing user missing name
        onboardingForm: {
            displayName: '',
            gender: '',
            startWeight: '',
            goalWeight: '',
            userHeight: '',
            userAge: ''
        },
        onboardingLoading: false,

        // Push Notifications
        pushEnabled: false,
        pushReminderTime: '20:00',
        pushPermission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
        pushLoading: false,

        // UI State
        activeTab: 'health',
        appLoaded: false,
        modalOpen: false,
        toast: { show: false, message: '', undoAction: null },
        _toastTimeout: null,
        confirmModal: { show: false, title: '', message: '', onConfirm: null, confirmLabel: null },

        // Pull-to-refresh
        _ptr: { active: false, startY: 0, currentY: 0, pulling: false, refreshing: false },

        // Offline indicator
        isOffline: !navigator.onLine,

        // Init error
        _initFailed: false,

        // Profile dropdown
        profileDropdownOpen: false,
        switchTab(tab) {
            if (this.activeTab !== tab) hapticSelection();
            this.activeTab = tab;
            this.updateThemeColor();
        },

        updateThemeColor() {
            const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
            let color;
            if (this.workoutActive) {
                color = isLight ? '#059669' : '#064e3b';
            } else if (this.activeTab === 'training') {
                color = isLight ? '#f0fdf4' : '#050505';
            } else {
                color = isLight ? '#f5f5f7' : '#050505';
            }
            const meta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: ' + (isLight ? 'light' : 'dark') + ')"]');
            if (meta) meta.setAttribute('content', color);
        },

        toggleProfileDropdown() {
            hapticLight();
            this.profileDropdownOpen = !this.profileDropdownOpen;
        },
        closeProfileDropdown() {
            this.profileDropdownOpen = false;
        },

        // Inputs & Display
        inputWeight: null,
        inputDate: getLocalDateString(),
        displayWeight: 0,
        displayBmi: 0,
        displayProgress: 0,
        displayLost: 0,
        _animFrames: {},
        _saving: false,
        quickLogWeight: null,

        // --- MIXINS ---
        ...settingsMixin(),
        ...trainingMixin(),
        ...trainingGeneratorMixin(),
        ...workoutMixin(),
        ...restTimerMixin(),
        ...caloriesMixin(),
        ...checkinMixin(),
        ...weightAnalysisMixin(),
        ...weeklyReportMixin(),

        // --- MIXIN GETTERS (must be defined here, not in mixins, because spread destroys getters) ---

        // Expose constants to template
        WEEKDAY_SHORT,
        ACTIVITY_LEVELS,

        // Training day navigation state
        trainingDayOffset: 0,
        trainingExpanded: false,

        // Training getters
        get todayTraining() {
            const idx = getTodayWeekdayIndex();
            return this.trainingPlan[idx] || [];
        },
        get todayWeekday() {
            return WEEKDAYS[getTodayWeekdayIndex()];
        },
        get isRestDay() {
            return this.todayTraining.length === 0;
        },
        get selectedDayIndex() {
            const base = getTodayWeekdayIndex();
            return ((base + this.trainingDayOffset) % 7 + 7) % 7;
        },
        get selectedDayName() {
            return WEEKDAYS[this.selectedDayIndex];
        },
        get selectedDayExercises() {
            return this.trainingPlan[this.selectedDayIndex] || [];
        },

        prevTrainingDay() {
            this.trainingDayOffset--;
        },
        nextTrainingDay() {
            this.trainingDayOffset++;
        },

        selectTrainingDay(dayIndex) {
            const todayIdx = getTodayWeekdayIndex();
            this.trainingDayOffset = dayIndex - todayIdx;
        },

        getWeekDates() {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
            const dates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                dates.push(d.getDate());
            }
            return dates;
        },

        getWeekTrainingStats() {
            let trainingDays = 0;
            let totalExercises = 0;
            for (let i = 0; i < 7; i++) {
                const exercises = this.trainingPlan[i] || [];
                if (exercises.length > 0) {
                    trainingDays++;
                    totalExercises += exercises.length;
                }
            }
            return { trainingDays, totalExercises, restDays: 7 - trainingDays };
        },

        // Workout getters
        get workoutDuration() {
            const s = this._workoutElapsed;
            const mins = Math.floor(s / 60);
            const secs = s % 60;
            return `${mins}:${String(secs).padStart(2, '0')}`;
        },
        get workoutCompletionPercent() {
            if (!this.workoutSession) return 0;
            let total = 0;
            let done = 0;
            for (const ex of this.workoutSession.exercises) {
                if (ex.tracked === false || ex.type === 'cardio' || ex.type === 'distance') {
                    total++;
                    if (ex.done) done++;
                } else if (ex.type === 'circuit') {
                    const rounds = ex.rounds || [];
                    if (rounds.length === 0) {
                        total++;
                        if (ex.done) done++;
                    } else {
                        total += rounds.length;
                        done += rounds.filter(r => r.done).length;
                    }
                } else {
                    const sets = ex.sets || [];
                    if (sets.length === 0) {
                        total++;
                        if (ex.done) done++;
                    } else {
                        total += sets.length;
                        done += sets.filter(s => s.done).length;
                    }
                }
            }
            if (total === 0) return 0;
            return Math.round((done / total) * 100);
        },

        // Workout history getters
        get filteredWorkoutHistory() {
            if (!this.workoutHistoryFilter) return this.workoutHistory;
            const q = this.workoutHistoryFilter.toLowerCase();
            return this.workoutHistory.filter(w =>
                (w.exercises || []).some(e => e.name.toLowerCase().includes(q))
            );
        },
        get workoutHistoryExerciseNames() {
            const names = new Set();
            for (const w of this.workoutHistory) {
                for (const e of (w.exercises || [])) {
                    names.add(e.name);
                }
            }
            return [...names].sort();
        },

        // Rest timer getters
        get restTimerProgress() {
            if (!this.restTimer.active || this.restTimer.total === 0) return 0;
            return ((this.restTimer.total - this.restTimer.remaining) / this.restTimer.total) * 100;
        },
        get restTimerDisplay() {
            const mins = Math.floor(this.restTimer.remaining / 60);
            const secs = this.restTimer.remaining % 60;
            return `${mins}:${String(secs).padStart(2, '0')}`;
        },

        // --- AUTH ---
        async handleLogin() {
            this.authError = '';
            this.authSuccess = '';
            if (!this.authEmail || !this.authPassword) {
                this.authError = 'Bitte E-Mail und Passwort eingeben.';
                return;
            }
            this.authLoading = true;
            const mockParams = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
            const isMock = !!mockParams?.has('dev');
            const isErrorMock = isMock && mockParams.has('error');
            try {
                if (isMock) {
                    await new Promise(r => setTimeout(r, 800));
                    if (isErrorMock) throw new Error('Mock-Fehler: Ungültige Zugangsdaten.');
                    this.authUser = { id: 'mock-user', email: this.authEmail };
                    this.authAnimationPending = true;
                    return;
                }
                await Supa.signIn(this.authEmail, this.authPassword);
            } catch (e) {
                const msg = e.message || '';
                if (msg === 'Invalid login credentials') {
                    this.authError = 'E-Mail oder Passwort falsch.';
                } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
                    this.authError = 'Bitte bestätige zuerst deine E-Mail-Adresse (prüfe dein Postfach).';
                } else {
                    this.authError = msg || 'Anmeldung fehlgeschlagen.';
                }
            } finally {
                this.authLoading = false;
            }
        },

        async handleRegister() {
            this.authError = '';
            this.authSuccess = '';
            if (!this.authEmail || !this.authPassword) {
                this.authError = 'Bitte E-Mail und Passwort eingeben.';
                return;
            }
            if (this.authPassword.length < 6) {
                this.authError = 'Passwort muss mindestens 6 Zeichen lang sein.';
                return;
            }
            this.authLoading = true;
            const mockParams = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
            const isMock = !!mockParams?.has('dev');
            const isErrorMock = isMock && mockParams.has('error');
            try {
                if (isMock) {
                    await new Promise(r => setTimeout(r, 800));
                    if (isErrorMock) throw new Error('Mock-Fehler: Registrierung fehlgeschlagen.');
                    this.authUser = { id: 'mock-user', email: this.authEmail };
                    this.authAnimationPending = true;
                    return;
                }
                const data = await Supa.signUp(this.authEmail, this.authPassword);
                if (data.user && data.session) {
                    // Auto-Confirm aktiv: Session existiert sofort → direkt einloggen
                    // onAuthStateChange wird den Rest übernehmen (Animation + loadAppData)
                } else if (data.user && !data.session) {
                    // Email-Bestätigung erforderlich
                    this.authSuccess = 'Registrierung erfolgreich! Prüfe dein Postfach und klicke den Bestätigungslink.';
                    this.authMode = 'login';
                }
            } catch (e) {
                const msg = e.message || '';
                if (msg.includes('already registered') || msg.includes('already been registered')) {
                    this.authError = 'Diese E-Mail ist bereits registriert. Versuche dich anzumelden.';
                } else if (msg.includes('valid email')) {
                    this.authError = 'Bitte eine gültige E-Mail-Adresse eingeben.';
                } else if (msg.includes('password')) {
                    this.authError = 'Passwort zu schwach — mind. 6 Zeichen.';
                } else {
                    this.authError = msg || 'Registrierung fehlgeschlagen.';
                }
            } finally {
                this.authLoading = false;
            }
        },

        async handleResetPassword() {
            this.authError = '';
            this.authSuccess = '';
            if (!this.authEmail) {
                this.authError = 'Bitte gib deine E-Mail-Adresse ein.';
                return;
            }
            try {
                await Supa.resetPassword(this.authEmail);
                this.authSuccess = 'Link zum Zurücksetzen wurde gesendet. Prüfe dein Postfach.';
            } catch (e) {
                this.authError = e.message || 'Fehler beim Zurücksetzen.';
            }
        },

        async handleSocialLogin(provider) {
            this.authError = '';
            this.authSuccess = '';
            this.authLoading = true;
            try {
                await Supa.signInWithProvider(provider);
            } catch (e) {
                this.authError = e.message || 'Anmeldung fehlgeschlagen.';
                this.authLoading = false;
            }
        },

        initDottedSurface() {
            if (this.dottedSurface) return;
            try {
                this.dottedSurface = DottedSurface.init();
            } catch (e) {
                console.error('DottedSurface init failed:', e);
            }
        },

        destroyDottedSurface() {
            if (this.dottedSurface) {
                this.dottedSurface.destroy();
                this.dottedSurface = null;
            }
        },

        triggerVaporizeAnimation(canvas) {
            VaporizeText.play(canvas, 'TrAction', () => {
                this.authAnimationPending = false;
                const isMock = import.meta.env.DEV && new URLSearchParams(location.search).has('dev');
                if (isMock) {
                    this.$nextTick(() => { this.appLoaded = true; });
                } else {
                    this.loadAppData();
                }
            });
        },

        async handleLogout() {
            try {
                this.profileDropdownOpen = false;
                await Supa.signOut();
                // onAuthStateChange listener handles state reset
            } catch (e) {
                console.error('Logout failed:', e);
                this.showToast('Abmeldung fehlgeschlagen — bitte erneut versuchen.');
            }
        },

        // --- ONBOARDING ---
        _getGoogleFirstName() {
            const meta = this.authUser?.user_metadata;
            if (!meta) return '';
            const fullName = meta.full_name || meta.name || '';
            return fullName.split(' ')[0] || '';
        },

        _isGoogleUser() {
            return this.authUser?.app_metadata?.provider === 'google';
        },

        async completeOnboarding() {
            const f = this.onboardingForm;
            const name = (f.displayName || '').trim();
            if (name.length < 2) {
                this.showToast('Bitte gib einen Namen ein (mind. 2 Zeichen)');
                return;
            }

            if (this.onboardingMode === 'full') {
                const sw = parseFloat(String(f.startWeight).replace(',', '.'));
                const gw = parseFloat(String(f.goalWeight).replace(',', '.'));
                const h = parseInt(f.userHeight);
                if (!sw || sw <= 0) {
                    this.showToast('Bitte ein gültiges Startgewicht eingeben');
                    return;
                }
                if (!gw || gw <= 0) {
                    this.showToast('Bitte ein gültiges Zielgewicht eingeben');
                    return;
                }
                if (!h || h <= 0) {
                    this.showToast('Bitte eine gültige Körpergröße eingeben');
                    return;
                }

                this.onboardingLoading = true;
                try {
                    this.displayName = name;
                    this.startWeight = sw;
                    this.goalWeight = gw;
                    this.userHeight = h;
                    this.userAge = parseInt(f.userAge) || 0;
                    this.gender = f.gender || null;

                    await Supa.saveSettings({
                        displayName: name,
                        startWeight: sw,
                        goalWeight: gw,
                        userHeight: h,
                        userAge: parseInt(f.userAge) || 0,
                        gender: f.gender || null,
                        activityLevel: 'moderately_active',
                        weeklyGoalRate: 0,
                        checklistItems: [...DEFAULT_PROFILE.checklistItems]
                    });

                    // Initialen Gewichtseintrag erstellen
                    const today = new Date().toISOString().slice(0, 10);
                    try {
                        await Supa.upsertWeightEntry(today, sw);
                        this.history = [{ date: today, weight: sw }];
                    } catch (weightErr) {
                        console.error('Initial weight entry failed:', weightErr);
                    }

                    if (this.recalculateCalories) this.recalculateCalories();
                    this.onboardingOpen = false;
                    this.showToast('Willkommen, ' + name + '!');
                } catch (e) {
                    console.error('Onboarding save failed:', e);
                    this.showToast('Profil konnte nicht gespeichert werden. Bitte erneut versuchen.');
                } finally {
                    this.onboardingLoading = false;
                }
            } else {
                // name_only mode
                this.onboardingLoading = true;
                try {
                    this.displayName = name;
                    await Supa.saveSettings({
                        displayName: name,
                        startWeight: this.startWeight,
                        goalWeight: this.goalWeight,
                        userHeight: this.userHeight,
                        userAge: this.userAge,
                        gender: this.gender,
                        activityLevel: this.activityLevel,
                        weeklyGoalRate: this.weeklyGoalRate,
                        checklistItems: this.checklistItems
                    });
                    this.onboardingOpen = false;
                    this.showToast('Willkommen zurück, ' + name + '!');
                } catch (e) {
                    console.error('Onboarding save failed:', e);
                    this.showToast('Profil konnte nicht gespeichert werden. Bitte erneut versuchen.');
                } finally {
                    this.onboardingLoading = false;
                }
            }
        },

        // --- PUSH NOTIFICATIONS ---
        _localToUtcTime(localTime) {
            const [h, m] = localTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            return d.toISOString().slice(11, 16);
        },

        _utcToLocalTime(utcTime) {
            const [h, m] = utcTime.split(':').map(Number);
            const d = new Date();
            d.setUTCHours(h, m, 0, 0);
            return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        },

        async loadPushState() {
            try {
                const sub = await Supa.getPushSubscription();
                if (sub) {
                    this.pushEnabled = sub.enabled;
                    this.pushReminderTime = this._utcToLocalTime(sub.reminder_time);
                }
            } catch (e) {
                console.error('Failed to load push state:', e);
            }
        },

        async togglePushNotifications() {
            if (this.pushLoading) return;
            this.pushLoading = true;

            try {
                if (this.pushEnabled) {
                    // Disable
                    await Supa.deletePushSubscription();
                    this.pushEnabled = false;
                    this.showToast('Benachrichtigungen deaktiviert');
                } else {
                    // Enable
                    const permission = await Notification.requestPermission();
                    this.pushPermission = permission;
                    if (permission !== 'granted') {
                        this.showToast('Benachrichtigungen wurden im Browser blockiert');
                        this.pushLoading = false;
                        return;
                    }

                    const reg = await navigator.serviceWorker.ready;
                    const subscription = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
                    });

                    const utcTime = this._localToUtcTime(this.pushReminderTime);
                    await Supa.savePushSubscription(subscription.toJSON(), utcTime);
                    this.pushEnabled = true;
                    this.showToast('Erinnerung um ' + this.pushReminderTime + ' aktiviert');
                }
            } catch (e) {
                console.error('Push toggle failed:', e);
                this.showToast('Fehler bei Benachrichtigungen');
            } finally {
                this.pushLoading = false;
            }
        },

        async updatePushReminderTime() {
            if (!this.pushEnabled) return;
            try {
                const reg = await navigator.serviceWorker.ready;
                const subscription = await reg.pushManager.getSubscription();
                if (subscription) {
                    const utcTime = this._localToUtcTime(this.pushReminderTime);
                    await Supa.savePushSubscription(subscription.toJSON(), utcTime);
                    this.showToast('Erinnerungszeit geändert: ' + this.pushReminderTime);
                }
            } catch (e) {
                console.error('Failed to update reminder time:', e);
            }
        },

        // --- CSV EXPORT ---
        exportWeightData() {
            if (!this.history || this.history.length === 0) {
                this.showToast('Keine Gewichtsdaten zum Exportieren');
                return;
            }
            exportWeightCSV(this.history);
            this.showToast('CSV-Datei heruntergeladen');
        },

        // --- INIT ---
        async initApp() {
            // Check auth state first
            try {
                const session = await Supa.getSession();
                this.authUser = session?.user || null;
            } catch (e) {
                console.error('Auth check failed:', e);
            }
            this.authReady = true;

            // DottedSurface: start when auth screen is visible, stop when user logs in
            this.$watch('authUser', (newUser) => {
                if (!newUser) {
                    this.$nextTick(() => this.initDottedSurface());
                } else {
                    this.destroyDottedSurface();
                }
            });
            if (!this.authUser) {
                this.$nextTick(() => this.initDottedSurface());
            }

            // Listen for auth changes (login/logout)
            // Store subscription for cleanup to prevent memory leaks
            const { data: { subscription: authSubscription } } = Supa.onAuthStateChange((session) => {
                const wasLoggedIn = !!this.authUser;
                this.authUser = session?.user || null;
                // If just logged in, load the app
                if (!wasLoggedIn && this.authUser) {
                    this.authEmail = '';
                    this.authPassword = '';
                    this.authError = '';
                    this.authAnimationPending = true;
                }
                // If just logged out, reset all user state and show auth screen
                if (wasLoggedIn && !this.authUser) {
                    this.displayName = '';
                    this.startWeight = DEFAULT_PROFILE.startWeight;
                    this.goalWeight = DEFAULT_PROFILE.goalWeight;
                    this.goalDate = null;
                    this.userHeight = DEFAULT_PROFILE.userHeight;
                    this.userAge = DEFAULT_PROFILE.userAge;
                    this.gender = null;
                    this.history = [];
                    this.workoutHistory = [];
                    this.workoutHistoryLoaded = false;
                    this.onboardingOpen = false;
                    this._initFailed = false;
                    this.appLoaded = true;
                }
            });
            this._authSubscription = authSubscription;

            // If already logged in, load data
            if (this.authUser) {
                await this.loadAppData();
            } else {
                this.appLoaded = true; // Show auth screen
            }

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(() => {});
            }

            // Offline detection
            window.addEventListener('online', () => { this.isOffline = false; });
            window.addEventListener('offline', () => { this.isOffline = true; });

            // Re-render chart when OS theme changes
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
                this.updateChart();
                this.updateThemeColor();
            });
        },

        async loadAppData() {
            try {
                // Einzeln laden mit Fallbacks, damit ein Fehler nicht alles blockiert
                const results = await Promise.allSettled([
                    Supa.getSettings(),
                    Supa.getTrainingPlan(),
                    Supa.getWeightEntries(),
                    Supa.getWorkoutLogs()
                ]);
                const settings = results[0].status === 'fulfilled' ? results[0].value : null;
                const trainingPlan = results[1].status === 'fulfilled' ? results[1].value : null;
                const weightEntries = results[2].status === 'fulfilled' ? results[2].value : [];
                const workoutLogs = results[3].status === 'fulfilled' ? results[3].value : [];
                const anyFailed = results.some(r => r.status === 'rejected');
                if (anyFailed) {
                    const errors = results.filter(r => r.status === 'rejected').map(r => r.reason?.message || 'Unbekannt');
                    console.error('Partial load failures:', errors);
                }

                // Apply settings
                if (settings) {
                    this.startWeight = settings.start_weight != null ? Number(settings.start_weight) : DEFAULT_PROFILE.startWeight;
                    this.goalWeight = settings.goal_weight != null ? Number(settings.goal_weight) : DEFAULT_PROFILE.goalWeight;
                    this.goalDate = settings.goal_date || null;
                    this.userHeight = settings.user_height != null ? parseInt(settings.user_height) : DEFAULT_PROFILE.userHeight;
                    this.userAge = settings.user_age != null ? parseInt(settings.user_age) : DEFAULT_PROFILE.userAge;
                    this.gender = settings.gender || null;
                    this.activityLevel = settings.activity_level || 'moderately_active';
                    this.weeklyGoalRate = settings.weekly_goal_rate != null ? Number(settings.weekly_goal_rate) : 0;
                    this.checklistItems = settings.checklist_items || [...DEFAULT_PROFILE.checklistItems];
                    this.displayName = settings.display_name || '';
                    this.avatarUrl = settings.avatar_url || '';
                }

                // Onboarding check: no settings = new user, no display_name = existing user
                if (!settings) {
                    this.onboardingMode = 'full';
                    this.onboardingForm = {
                        displayName: this._getGoogleFirstName() || '',
                        gender: '',
                        startWeight: '',
                        goalWeight: '',
                        userHeight: '',
                        userAge: ''
                    };
                    this.onboardingOpen = true;
                } else if (!settings.display_name) {
                    this.onboardingMode = 'name_only';
                    this.onboardingForm = {
                        displayName: this._getGoogleFirstName() || '',
                        gender: this.gender || '',
                        startWeight: this.startWeight || '',
                        goalWeight: this.goalWeight || '',
                        userHeight: this.userHeight || '',
                        userAge: this.userAge || ''
                    };
                    this.onboardingOpen = true;
                }

                // Apply training plan
                if (trainingPlan) {
                    this.trainingPlan = trainingPlan;
                }

                // Apply weight entries
                this.history = (weightEntries && weightEntries.length > 0) ? weightEntries : [];
                this.history.sort((a, b) => a.date.localeCompare(b.date));

                // Apply workout logs
                this.workoutHistory = workoutLogs || [];
                this.workoutHistoryLoaded = true;

            } catch (e) {
                console.error('Failed to initialize app:', e);
                this._initFailed = true;
                this.showToast('Daten konnten nicht geladen werden — Verbindung prüfen');
            }

            // Restore active workout from localStorage (crash recovery)
            this.restoreWorkoutFromStorage();

            // Kalorien berechnen
            this.recalculateCalories();

            // Checkins laden
            try { await this.loadCheckins(); } catch(e) { console.error('Failed to load checkins:', e); }
            try { await this.loadPushState(); } catch(e) { console.error('Failed to load push state:', e); }

            this.$nextTick(() => {
                this.appLoaded = true;
                try {
                    this.renderChart();
                    this.refreshAnimations();
                    this.initPullToRefresh();
                    this.handleShortcutAction();
                    this.updateThemeColor();
                } catch (e) {
                    console.error('Post-load init error:', e);
                }
            });
        },

        // --- PULL TO REFRESH ---
        initPullToRefresh() {
            const ptrEl = document.getElementById('ptr-indicator');
            if (!ptrEl) return;

            const THRESHOLD = 80;
            const MAX_PULL = 130;

            const getScrollTop = () =>
                Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop, 0);

            const isAnyModalOpen = () =>
                this.modalOpen || this.settingsOpen || this.profileOpen ||
                this.trainingOpen ||
                this.bmiDetailOpen ||
                this.workoutOpen || this.workoutHistoryOpen ||
                this.workoutPickerOpen ||
                this.profileDropdownOpen;

            document.addEventListener('touchstart', (e) => {
                if (getScrollTop() > 5 || isAnyModalOpen() || this._ptr.refreshing) return;
                this._ptr.startY = e.touches[0].clientY;
                this._ptr.active = true;
                this._ptr.pulling = false;
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (!this._ptr.active || this._ptr.refreshing) return;
                const currentY = e.touches[0].clientY;
                const diff = currentY - this._ptr.startY;

                if (diff < 0 || getScrollTop() > 5) {
                    this._ptr.active = false;
                    ptrEl.style.transform = 'translateY(-100%)';
                    ptrEl.style.opacity = '0';
                    return;
                }

                if (diff > 10) {
                    e.preventDefault();
                }

                this._ptr.pulling = true;
                const pull = Math.min(diff, MAX_PULL);
                const progress = Math.min(pull / THRESHOLD, 1);
                this._ptr.currentY = pull;

                ptrEl.style.transform = `translateY(${pull - 60}px)`;
                ptrEl.style.opacity = String(progress);

                const icon = ptrEl.querySelector('.ptr-icon');
                if (icon) {
                    icon.style.transform = `rotate(${progress * 180}deg)`;
                    if (progress >= 1) {
                        icon.classList.add('ptr-ready');
                    } else {
                        icon.classList.remove('ptr-ready');
                    }
                }
            }, { passive: false });

            document.addEventListener('touchend', () => {
                if (!this._ptr.active || !this._ptr.pulling) {
                    this._ptr.active = false;
                    return;
                }

                const pull = this._ptr.currentY;
                this._ptr.active = false;
                this._ptr.pulling = false;

                if (pull >= THRESHOLD && !this._ptr.refreshing) {
                    this._ptr.refreshing = true;
                    ptrEl.style.transform = 'translateY(20px)';
                    ptrEl.classList.add('ptr-refreshing');

                    this.refreshDashboard().finally(() => {
                        setTimeout(() => {
                            ptrEl.style.transform = 'translateY(-100%)';
                            ptrEl.style.opacity = '0';
                            ptrEl.classList.remove('ptr-refreshing');
                            this._ptr.refreshing = false;
                        }, 400);
                    });
                } else {
                    ptrEl.style.transform = 'translateY(-100%)';
                    ptrEl.style.opacity = '0';
                }

                this._ptr.currentY = 0;
            }, { passive: true });
        },

        async refreshDashboard() {
            try {
                const [settings, trainingPlan, weightEntries, workoutLogs] =
                    await Promise.all([
                        Supa.getSettings(),
                        Supa.getTrainingPlan(),
                        Supa.getWeightEntries(),
                        Supa.getWorkoutLogs()
                    ]);

                if (settings) {
                    this.startWeight = settings.start_weight != null ? Number(settings.start_weight) : DEFAULT_PROFILE.startWeight;
                    this.goalWeight = settings.goal_weight != null ? Number(settings.goal_weight) : DEFAULT_PROFILE.goalWeight;
                    this.goalDate = settings.goal_date || null;
                    this.userHeight = settings.user_height != null ? parseInt(settings.user_height) : DEFAULT_PROFILE.userHeight;
                    this.userAge = settings.user_age != null ? parseInt(settings.user_age) : DEFAULT_PROFILE.userAge;
                    this.gender = settings.gender || null;
                    this.activityLevel = settings.activity_level || 'moderately_active';
                    this.weeklyGoalRate = settings.weekly_goal_rate != null ? Number(settings.weekly_goal_rate) : 0;
                    this.checklistItems = settings.checklist_items || [...DEFAULT_PROFILE.checklistItems];
                }
                if (trainingPlan) this.trainingPlan = trainingPlan;
                this.history = (weightEntries && weightEntries.length > 0) ? weightEntries : [];
                this.history.sort((a, b) => a.date.localeCompare(b.date));
                this.workoutHistory = workoutLogs || [];
                this.workoutHistoryLoaded = true;
                this.recalculateCalories();
                try { await this.loadCheckins(); } catch(e) {}
                this._initFailed = false;

                this.$nextTick(() => {
                    this.updateChart();
                    this.refreshAnimations();
                });

                this.showToast('Dashboard aktualisiert');
            } catch (e) {
                console.error('Failed to refresh dashboard:', e);
                this.showToast('Aktualisierung fehlgeschlagen');
            }
        },

        // --- DATA MANIPULATION ---
        openModal() {
            hapticLight();
            this.inputWeight = this.currentWeight;
            this.inputDate = getLocalDateString();
            this.modalOpen = true;
            setTimeout(() => document.getElementById('weightInput')?.focus(), 100);
        },
        closeModal() { this.modalOpen = false; },

        async addEntry() {
            if (this._saving) return;
            const w = parseFloat(String(this.inputWeight).replace(',', '.'));
            if (!w || isNaN(w)) return;

            this._saving = true;
            const entryDate = this.inputDate;

            this.closeModal();
            this.inputWeight = null;

            // Optimistic UI update — save snapshot for rollback
            const previousHistory = [...this.history];
            this.history = this.history.filter(h => h.date !== entryDate);
            this.history.push({ date: entryDate, weight: w });
            this.history.sort((a, b) => a.date.localeCompare(b.date));

            try {
                await Supa.upsertWeightEntry(entryDate, w);
                hapticSuccess();
                this.recalculateCalories();
                this.showToast(w.toFixed(1) + ' kg gespeichert');
            } catch (e) {
                console.error('Eintrag speichern fehlgeschlagen:', e);
                // Rollback on failure
                this.history = previousHistory;
                this.showToast('Fehler beim Speichern');
            }

            this.$nextTick(() => {
                this.updateChart();
                this.refreshAnimations();
            });
            this._saving = false;
        },

        get todayWeight() {
            const today = getLocalDateString();
            const entry = this.history.find(h => h.date === today);
            return entry ? entry.weight : null;
        },

        get quickLogDisplay() {
            if (this.quickLogWeight !== null) return this.quickLogWeight;
            return this.todayWeight !== null ? this.todayWeight : this.currentWeight;
        },

        quickLogStep(delta) {
            const base = this.quickLogDisplay;
            if (!base || base === 0) return;
            hapticLight();
            this.quickLogWeight = Math.round((base + delta) * 10) / 10;
        },

        async quickLogSave() {
            const w = this.quickLogDisplay;
            if (!w || w === 0 || this._saving) return;
            const entryDate = getLocalDateString();

            this._saving = true;

            // Optimistic UI update with rollback
            const previousHistory = [...this.history];
            this.history = this.history.filter(h => h.date !== entryDate);
            this.history.push({ date: entryDate, weight: w });
            this.history.sort((a, b) => a.date.localeCompare(b.date));

            let saved = true;
            try {
                await Supa.upsertWeightEntry(entryDate, w);
            } catch (e) {
                console.error('Failed to save quick entry:', e);
                this.history = previousHistory;
                this.showToast('Fehler beim Speichern');
                saved = false;
            }

            this.$nextTick(() => {
                try {
                    this.updateChart();
                    this.refreshAnimations();
                } finally {
                    this._saving = false;
                }
            });

            this.quickLogWeight = null;
            if (saved) {
                hapticSuccess();
                this.recalculateCalories();
                this.showToast(w.toFixed(1) + ' kg gespeichert');
            }
        },

        deleteEntry(index) {
            const logEntry = this.logs[index];
            if (!logEntry) return;
            hapticWarning();

            const removed = { date: logEntry.date, weight: logEntry.weight };
            this.history = this.history.filter(h => h.date !== removed.date);

            Supa.deleteWeightEntry(removed.date).catch(e => {
                console.error('Failed to delete entry:', e);
                this.showToast('Fehler beim Löschen');
            });

            try { this.updateChart(); } catch (e) {}
            this.refreshAnimations();

            this.showToast('Eintrag gelöscht', () => {
                this.history.push(removed);
                this.history.sort((a, b) => a.date.localeCompare(b.date));
                Supa.upsertWeightEntry(removed.date, removed.weight).catch(e => console.error('Failed to restore entry:', e));
                this.updateChart();
                this.refreshAnimations();
            });
        },

        clearAllEntries() {
            this.confirmModal = {
                show: true,
                title: 'Alle Einträge löschen',
                message: this.history.length + ' Gewichtseinträge löschen?',
                onConfirm: async () => {
                    this.history = [];
                    try {
                        await Supa.clearAllWeightEntries();
                    } catch (e) {
                        console.error('Failed to clear entries:', e);
                    }
                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
                    }
                    this.updateChart();
                    this.refreshAnimations();
                    this.showToast('Alle Einträge gelöscht');
                }
            };
        },

        resetData() {
            this.confirmModal = {
                show: true,
                title: 'Vollständiger Reset',
                message: 'Alle Daten inklusive Einstellungen und Training löschen?',
                onConfirm: async () => {
                    try {
                        await Promise.all([
                            Supa.clearAllWeightEntries(),
                            Supa.saveSettings({
                                startWeight: 0, goalWeight: 0, goalDate: null,
                                userHeight: 0, userAge: 0,
                                gender: null, activityLevel: 'moderately_active',
                                weeklyGoalRate: 0, checklistItems: DEFAULT_PROFILE.checklistItems
                            }),
                            Supa.saveTrainingPlan(Array.from({ length: 7 }, () => [])),
                            Supa.clearAllWorkoutLogs(),
                            Supa.clearAllCheckins()
                        ]);
                    } catch (e) {
                        console.error('Failed to reset data:', e);
                    }

                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
                    }

                    this.history = [];
                    this.startWeight = 0;
                    this.goalWeight = 0;
                    this.goalDate = null;
                    this.userHeight = 0;
                    this.userAge = 0;
                    this.trainingPlan = Array.from({ length: 7 }, () => []);
                    this.workoutHistory = [];
                    this.gender = null;
                    this.activityLevel = 'moderately_active';
                    this.weeklyGoalRate = 0;
                    this.checklistItems = [...DEFAULT_PROFILE.checklistItems];
                    this.calorieData = { bmr: 0, tdee: 0, adjustment: 0, target: 0, isClamped: false, mode: 'maintenance' };
                    this.todayCheckin = [];
                    this.checkinHistory = [];
                    this.checkinStreak = 0;

                    this.settingsOpen = false;
                    this.updateChart();
                    this.refreshAnimations();
                    this.showToast('Alle Daten gelöscht');
                }
            };
        },

        // --- COMPUTED / HELPERS ---
        get logs() {
            return [...this.history].reverse();
        },

        get currentWeight() {
            if (this.history.length === 0) return this.startWeight;
            return this.history[this.history.length - 1].weight;
        },

        get bmi() {
            return calculateBMI(this.currentWeight, this.userHeight);
        },

        get bmiRanges() {
            return getBMIRanges(this.userHeight);
        },

        get trend() {
            return calculateTrend(this.history);
        },

        get globalProgress() {
            const total = this.startWeight - this.goalWeight;
            if (this.startWeight === 0 && this.goalWeight === 0) return 0;
            if (Math.abs(total) < 0.1) return 100;
            const done = this.startWeight - this.currentWeight;
            const pct = (done / total) * 100;
            return Math.round(Math.min(Math.max(pct, 0), 100));
        },

        get oracle() {
            return calculateOracle(this.history, this.currentWeight, this.goalWeight);
        },

        get streakDays() {
            if (this.history.length === 0) return 0;
            const uniqueDates = [...new Set(this.history.map(h => h.date))].sort();
            const today = getLocalDateString();
            const lastLog = uniqueDates[uniqueDates.length - 1];
            const daysDiff = Math.round((new Date(today) - new Date(lastLog)) / (1000 * 60 * 60 * 24));
            if (daysDiff > 1) return 0;
            let streak = 1;
            for (let i = uniqueDates.length - 1; i > 0; i--) {
                const currDate = new Date(uniqueDates[i]);
                const prevDate = new Date(uniqueDates[i - 1]);
                const calendarDaysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
                if (calendarDaysDiff === 1) streak++; else break;
            }
            return streak;
        },

        get filteredHistory() {
            if (this.chartFilter === 'ALL') return this.history;
            const now = new Date();
            const cutoff = new Date();
            if (this.chartFilter === '1M') cutoff.setDate(now.getDate() - 30);
            else if (this.chartFilter === '3M') cutoff.setMonth(now.getMonth() - 3);
            return this.history.filter(h => new Date(h.date) >= cutoff);
        },

        get weeklyTrend() {
            const now = new Date();
            const thisMonday = new Date(now);
            thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            thisMonday.setHours(0, 0, 0, 0);
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(lastMonday.getDate() - 7);
            const thisWeekEntries = this.history.filter(h => new Date(h.date) >= thisMonday);
            const lastWeekEntries = this.history.filter(h => {
                const d = new Date(h.date);
                return d >= lastMonday && d < thisMonday;
            });
            const avg = arr => arr.length ? arr.reduce((s, e) => s + e.weight, 0) / arr.length : null;
            const thisWeekAvg = avg(thisWeekEntries);
            const lastWeekAvg = avg(lastWeekEntries);
            return {
                thisWeek: thisWeekAvg,
                lastWeek: lastWeekAvg,
                change: (thisWeekAvg !== null && lastWeekAvg !== null) ? thisWeekAvg - lastWeekAvg : null
            };
        },

        getLogDelta(index) {
            const logs = this.logs;
            if (index >= logs.length - 1) return null;
            if (!logs[index] || !logs[index + 1]) return null;
            return logs[index].weight - logs[index + 1].weight;
        },

        getWeightForDate(date) {
            const entry = this.history.find(h => h.date === date);
            return entry ? entry.weight.toFixed(1) + ' kg' : '';
        },

        // --- SHORTCUT ACTION HANDLER (manifest shortcuts via ?action=) ---
        handleShortcutAction() {
            const params = new URLSearchParams(window.location.search);
            const action = params.get('action');
            if (!action) return;
            window.history.replaceState({}, '', window.location.pathname);
            if (action === 'log-weight') {
                this.activeTab = 'health';
                setTimeout(() => this.openModal(), 300);
            }
        },

        // --- ESCAPE KEY HANDLER (centralized) ---
        handleEscape() {
            if (this.profileDropdownOpen) { this.closeProfileDropdown(); return; }
            if (this.confirmModal.show) { this.cancelConfirm(); return; }
            if (this.workoutHistoryOpen) { this.closeWorkoutHistory(); return; }
            if (this.workoutPickerOpen) { this.closeWorkoutPicker(); return; }
            if (this.workoutOpen) { this.closeWorkout(); return; }
            if (this.bmiDetailOpen) { this.closeBmiDetail(); return; }
            if (this.modalOpen) { this.closeModal(); return; }
            if (this.profileOpen) { this.closeProfile(); return; }
            if (this.settingsOpen) { this.closeSettings(); return; }
            if (this.trainingOpen) { this.closeTraining(); return; }
        },

        // --- ANIMATIONS & UI UTILS ---
        showToast(message, undoFn) {
            clearTimeout(this._toastTimeout);
            this.toast = { show: true, message, undoAction: undoFn || null };
            this._toastTimeout = setTimeout(() => { this.toast.show = false; }, 5000);
        },
        undoToast() {
            if (this.toast.undoAction) this.toast.undoAction();
            clearTimeout(this._toastTimeout);
            this.toast.show = false;
        },
        confirmAction() {
            if (!this.confirmModal.show) return;
            const callback = this.confirmModal.onConfirm;
            this.confirmModal.show = false;
            this.confirmModal.onConfirm = null;
            if (callback) callback();
        },
        cancelConfirm() {
            if (!this.confirmModal.show) return;
            this.confirmModal.show = false;
        },

        trapFocus(event, container) {
            const focusable = container.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        },

        animateTo(key, target, duration = 600) {
            if (this._animFrames[key]) cancelAnimationFrame(this._animFrames[key]);
            const start = this[key];
            const diff = target - start;
            if (Math.abs(diff) < 0.01) { this[key] = target; return; }
            const startTime = performance.now();
            const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const step = (now) => {
                const elapsed = Math.min((now - startTime) / duration, 1);
                this[key] = start + diff * ease(elapsed);
                if (elapsed < 1) { this._animFrames[key] = requestAnimationFrame(step); }
            };
            this._animFrames[key] = requestAnimationFrame(step);
        },

        refreshAnimations() {
            const h = this.userHeight / 100;
            const safeBmi = h > 0 ? parseFloat((this.currentWeight / (h * h)).toFixed(1)) : 0;
            this.animateTo('displayWeight', this.currentWeight, 800);
            this.animateTo('displayBmi', safeBmi, 600);
            this.animateTo('displayProgress', parseFloat(this.globalProgress), 1000);
            this.animateTo('displayLost', this.startWeight - this.currentWeight, 700);
        },

        // --- CHARTING ---
        computeMovingAverage(values, windowSize) {
            return values.map((_, i) => {
                const start = Math.max(0, i - windowSize + 1);
                const slice = values.slice(start, i + 1);
                return slice.reduce((a, b) => a + b, 0) / slice.length;
            });
        },

        setChartFilter(filter) {
            hapticSelection();
            this.chartFilter = filter;
            this.updateChart();
        },

        getRawChartData() {
            return JSON.parse(JSON.stringify(this.filteredHistory));
        },

        buildGoalLineData(data) {
            if (!this.goalDate || !this.goalWeight || data.length === 0) return null;

            const goalDate = new Date(this.goalDate);
            const startDate = new Date(data[0].date);
            const endDate = new Date(data[data.length - 1].date);
            const goalWeight = this.goalWeight;
            const startWeight = this.startWeight;

            const goalLineData = data.map(entry => {
                const entryDate = new Date(entry.date);
                const totalDays = (goalDate - startDate) / (1000 * 60 * 60 * 24);
                if (totalDays <= 0) return null;
                const elapsedDays = (entryDate - startDate) / (1000 * 60 * 60 * 24);
                const progress = Math.min(elapsedDays / totalDays, 1);
                return startWeight + (goalWeight - startWeight) * progress;
            });

            if (goalDate > endDate) {
                const totalDays = (goalDate - startDate) / (1000 * 60 * 60 * 24);
                const lastDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                const lastProgress = Math.min(lastDays / totalDays, 1);
                goalLineData[goalLineData.length - 1] = startWeight + (goalWeight - startWeight) * lastProgress;
            }

            return goalLineData;
        },

        renderChart() {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

            const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
            const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
            gradient.addColorStop(0, isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)');
            gradient.addColorStop(1, isLight ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)');

            Chart.defaults.font.family = 'JetBrains Mono';
            Chart.defaults.color = getCSSVar('--muted') || '#8b8b94';

            const data = this.getRawChartData();
            const weights = data.map(h => h.weight);
            const movingAvg = this.computeMovingAverage(weights, 7);
            const goalLineData = this.buildGoalLineData(data);

            const datasets = [{
                label: 'Gewicht',
                data: weights,
                borderColor: getCSSVar('--text-primary') || '#fff',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHitRadius: 20
            }, {
                label: '7-Tage Ø',
                data: movingAvg,
                borderColor: 'rgba(129, 140, 248, 0.5)',
                borderWidth: 1.5,
                borderDash: [4, 4],
                fill: false,
                pointRadius: 0
            }];

            if (goalLineData) {
                datasets.push({
                    label: 'Ziellinie',
                    data: goalLineData,
                    borderColor: 'rgba(16, 185, 129, 0.45)',
                    borderWidth: 1.5,
                    borderDash: [8, 4],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                });
            }

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(h => new Date(h.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })),
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false, axis: 'x' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            mode: 'index',
                            intersect: false,
                            caretSize: 6,
                            cornerRadius: 10,
                            padding: 10,
                            titleFont: { size: 11, weight: 'bold' },
                            bodyFont: { size: 12 },
                            displayColors: false,
                            callbacks: {
                                label: (ctx) => {
                                    if (ctx.dataset.label === 'Ziellinie') return null;
                                    return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + ' kg';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
                        y: { grid: { color: getCSSVar('--glass') || 'rgba(255,255,255,0.03)' }, border: { display: false } }
                    }
                }
            });
        },

        updateChart() {
            if (chartInstance) {
                requestAnimationFrame(() => {
                    try {
                        const data = this.getRawChartData();
                        const weights = data.map(h => h.weight);
                        if (!chartInstance) return;
                        chartInstance.data.labels = data.map(h => new Date(h.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }));
                        chartInstance.data.datasets[0].data = weights;
                        if (chartInstance.data.datasets[1]) {
                            chartInstance.data.datasets[1].data = this.computeMovingAverage(weights, 7);
                        }
                        const goalLineData = this.buildGoalLineData(data);
                        const goalDatasetIdx = chartInstance.data.datasets.findIndex(d => d.label === 'Ziellinie');
                        if (goalLineData) {
                            if (goalDatasetIdx >= 0) {
                                chartInstance.data.datasets[goalDatasetIdx].data = goalLineData;
                            } else {
                                chartInstance.data.datasets.push({
                                    label: 'Ziellinie',
                                    data: goalLineData,
                                    borderColor: 'rgba(16, 185, 129, 0.45)',
                                    borderWidth: 1.5,
                                    borderDash: [8, 4],
                                    fill: false,
                                    pointRadius: 0,
                                    pointHoverRadius: 0
                                });
                            }
                        } else if (goalDatasetIdx >= 0) {
                            chartInstance.data.datasets.splice(goalDatasetIdx, 1);
                        }
                        chartInstance.update('none');
                    } catch (e) {
                        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
                        this.renderChart();
                    }
                });
            } else {
                 this.renderChart();
            }
        }
    };
}

// Make available globally for Alpine
window.app = app;

// Register custom Alpine directives
registerSwipeDismiss(Alpine);

// Start Alpine
Alpine.start();
