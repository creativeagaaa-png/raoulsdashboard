export const rewardsMixin = () => ({
    checkUnlocks(oldW, newW) {
        if (typeof oldW !== 'number' || typeof newW !== 'number') return;

        const unlocked = this.rewards.find(r => newW <= r.target && oldW > r.target);
        if (unlocked) {
            this.unlockedReward = unlocked;
            this.lootboxOpen = true;
            setTimeout(() => this.triggerConfetti(), 300);
        }
    },

    closeLootbox() { this.lootboxOpen = false; },

    triggerConfetti() {
        if (typeof confetti !== 'function') return;
        try {
            const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 100 };
            confetti({ ...defaults, particleCount: 100, origin: { y: 0.6 } });
        } catch (e) { console.error('Confetti error:', e); }
    }
});
