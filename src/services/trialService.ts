import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_STORAGE_KEY = 'eatsense_trials';

interface TrialData {
    [id: string]: number; // timestamp of start
}

class TrialService {
    private trials: TrialData = {};
    private initialized = false;

    async init() {
        if (this.initialized) return;
        try {
            const data = await AsyncStorage.getItem(TRIAL_STORAGE_KEY);
            if (data) {
                this.trials = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load trials', e);
        }
        this.initialized = true;
    }

    async startTrial(contentId: string): Promise<boolean> {
        await this.init();
        if (this.isTrialUsed(contentId)) return false;

        this.trials[contentId] = Date.now();
        await this.save();
        return true;
    }

    isTrialActive(contentId: string): boolean {
        if (!this.trials[contentId]) return false;

        const now = Date.now();
        const start = this.trials[contentId];
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        return (now - start) < sevenDaysMs;
    }

    isTrialUsed(contentId: string): boolean {
        // If it was started, it is "used" (even if active).
        // Wait, if it's active, it's "used" but "valid".
        // Use this to prevent re-starting.
        return !!this.trials[contentId];
    }

    // Check if trial is expired (Trial started AND > 7 days)
    isTrialExpired(contentId: string): boolean {
        if (!this.trials[contentId]) return false;

        const now = Date.now();
        const start = this.trials[contentId];
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        return (now - start) >= sevenDaysMs;
    }

    private async save() {
        try {
            await AsyncStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(this.trials));
        } catch (e) {
            console.error('Failed to save trials', e);
        }
    }
}

export const trialService = new TrialService();
