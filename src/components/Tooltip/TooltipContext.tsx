/**
 * TooltipContext - Context for managing onboarding tooltips
 * Tracks which tooltips have been shown and provides methods to show/dismiss them
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tooltip IDs for different features
export const TooltipIds = {
    SCAN_MEAL: 'tooltip_scan_meal',
    DASHBOARD_OVERVIEW: 'tooltip_dashboard_overview',
    LIFESTYLES_INTRO: 'tooltip_lifestyles_intro',
    MEDICATION_SCHEDULE: 'tooltip_medication_schedule',
    AI_ASSISTANT: 'tooltip_ai_assistant',
    PROFILE_SETTINGS: 'tooltip_profile_settings',
} as const;

export type TooltipId = typeof TooltipIds[keyof typeof TooltipIds];

const STORAGE_KEY = '@eatsense_shown_tooltips';

interface TooltipContextValue {
    // Check if a tooltip should be shown (hasn't been dismissed yet)
    shouldShowTooltip: (id: TooltipId) => boolean;
    // Mark a tooltip as shown/dismissed
    dismissTooltip: (id: TooltipId) => Promise<void>;
    // Reset all tooltips (for testing/settings)
    resetAllTooltips: () => Promise<void>;
    // Check if tooltips are enabled
    tooltipsEnabled: boolean;
    // Toggle tooltips on/off
    setTooltipsEnabled: (enabled: boolean) => Promise<void>;
    // Loading state
    isLoading: boolean;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
    const [shownTooltips, setShownTooltips] = useState<Set<string>>(new Set());
    const [tooltipsEnabled, setTooltipsEnabledState] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Load shown tooltips from storage on mount
    useEffect(() => {
        const loadTooltipState = async () => {
            try {
                const [storedTooltips, enabledSetting] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(`${STORAGE_KEY}_enabled`),
                ]);

                if (storedTooltips) {
                    const parsed = JSON.parse(storedTooltips) as string[];
                    setShownTooltips(new Set(parsed));
                }

                if (enabledSetting !== null) {
                    setTooltipsEnabledState(enabledSetting === 'true');
                }
            } catch (error) {
                console.error('[TooltipContext] Failed to load tooltip state:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadTooltipState();
    }, []);

    // Check if a tooltip should be shown
    const shouldShowTooltip = useCallback((id: TooltipId): boolean => {
        if (!tooltipsEnabled || isLoading) return false;
        return !shownTooltips.has(id);
    }, [shownTooltips, tooltipsEnabled, isLoading]);

    // Dismiss a tooltip
    const dismissTooltip = useCallback(async (id: TooltipId) => {
        try {
            const newShownTooltips = new Set(shownTooltips);
            newShownTooltips.add(id);
            setShownTooltips(newShownTooltips);

            // Persist to storage
            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(Array.from(newShownTooltips))
            );
        } catch (error) {
            console.error('[TooltipContext] Failed to dismiss tooltip:', error);
        }
    }, [shownTooltips]);

    // Reset all tooltips
    const resetAllTooltips = useCallback(async () => {
        try {
            setShownTooltips(new Set());
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('[TooltipContext] Failed to reset tooltips:', error);
        }
    }, []);

    // Toggle tooltips enabled/disabled
    const setTooltipsEnabled = useCallback(async (enabled: boolean) => {
        try {
            setTooltipsEnabledState(enabled);
            await AsyncStorage.setItem(`${STORAGE_KEY}_enabled`, String(enabled));
        } catch (error) {
            console.error('[TooltipContext] Failed to update tooltip setting:', error);
        }
    }, []);

    const value: TooltipContextValue = {
        shouldShowTooltip,
        dismissTooltip,
        resetAllTooltips,
        tooltipsEnabled,
        setTooltipsEnabled,
        isLoading,
    };

    return (
        <TooltipContext.Provider value={value}>
            {children}
        </TooltipContext.Provider>
    );
}

export function useTooltip() {
    const context = useContext(TooltipContext);
    if (!context) {
        throw new Error('useTooltip must be used within a TooltipProvider');
    }
    return context;
}

export default TooltipContext;
