import { hapticSuccess } from '../utils/haptics.js';

export const restTimerMixin = () => ({
    restTimer: {
        active: false,
        remaining: 0,
        total: 90,
        defaultDuration: 90,
        interval: null,
        _endTimestamp: null
    },

    startRestTimer(duration) {
        const dur = duration || this.restTimer.defaultDuration;
        this.clearRestTimer();
        this.restTimer.total = dur;
        this.restTimer.remaining = dur;
        this.restTimer.active = true;
        this.restTimer._endTimestamp = Date.now() + dur * 1000;

        this.restTimer.interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((this.restTimer._endTimestamp - now) / 1000));
            this.restTimer.remaining = remaining;
            if (remaining <= 0) {
                this.restTimerComplete();
            }
        }, 250);
    },

    restTimerComplete() {
        this.clearRestTimer();
        hapticSuccess();
        this.playTimerBeep();
    },

    playTimerBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.value = 1000;
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(ctx.currentTime + 0.3);
            }, 300);
        } catch (e) { /* Audio not available */ }
    },

    clearRestTimer() {
        if (this.restTimer.interval) {
            clearInterval(this.restTimer.interval);
            this.restTimer.interval = null;
        }
        this.restTimer.active = false;
        this.restTimer.remaining = 0;
        this.restTimer._endTimestamp = null;
    },

    skipRestTimer() {
        this.clearRestTimer();
    },

    setRestDuration(seconds) {
        this.restTimer.defaultDuration = seconds;
        if (this.restTimer.active) {
            this.startRestTimer(seconds);
        }
    },

    // NOTE: restTimerProgress, restTimerDisplay are defined as getters
    // in main.js to preserve reactivity (spread destroys getters).
});
