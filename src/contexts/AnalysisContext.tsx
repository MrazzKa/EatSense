import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import ApiService from '../services/apiService';

/**
 * Analysis status types
 */
export type AnalysisStatus = 'processing' | 'completed' | 'failed' | 'needs_review';

/**
 * Pending analysis item
 */
export interface PendingAnalysis {
    id: string;
    analysisId: string;
    status: AnalysisStatus;
    localPreviewUri?: string;
    imageUrl?: string;
    dishName?: string;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    healthScore?: number | null;
    ingredients?: Array<{ name: string; portion_g?: number }>;
    errorMessage?: string | null;
    startedAt: number;
    updatedAt: number;
    pollAttempts: number;
}

/**
 * Analysis context interface
 */
interface AnalysisContextType {
    pendingAnalyses: Map<string, PendingAnalysis>;
    addPendingAnalysis: (analysisId: string, localPreviewUri?: string) => void;
    updateAnalysis: (analysisId: string, updates: Partial<PendingAnalysis>) => void;
    removePendingAnalysis: (analysisId: string) => void;
    retryAnalysis: (analysisId: string) => Promise<void>;
    getAnalysisById: (analysisId: string) => PendingAnalysis | undefined;
    isPolling: boolean;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 3000;
const POLL_BACKOFF_MULTIPLIER = 1.2;

/**
 * Derive status from analysis data
 */
function deriveStatus(data: any): AnalysisStatus {
    if (!data) return 'processing';

    // Check for explicit error
    if (data.error || data.errorMessage) {
        return 'failed';
    }

    // Check if explicitly marked as processing
    if (data.status === 'processing' || data.status === 'pending') {
        return 'processing';
    }

    // Check for valid nutrition data
    const calories = data.totalCalories ?? data.calories ?? 0;
    const hasValidNutrition = calories > 0;

    // If no valid nutrition and no dish name, still processing
    if (!hasValidNutrition && !data.dishName && !data.name) {
        return 'processing';
    }

    // If has dish name but zero calories, needs review
    if (!hasValidNutrition && (data.dishName || data.name)) {
        return 'needs_review';
    }

    return 'completed';
}

/**
 * Extract analysis data from API response
 */
function extractAnalysisData(apiResponse: any): Partial<PendingAnalysis> {
    if (!apiResponse) return {};

    // Check explicit API status first - this determines if polling should stop
    const apiStatus = (apiResponse?.status || '').toLowerCase();
    const isCompleted = apiStatus === 'completed';
    const isFailed = apiStatus === 'failed';

    const data = apiResponse.data || apiResponse;

    // Check for explicit error
    const hasError = !!(data.error || data.errorMessage);

    // Get flags from API response
    const flags = data.analysisFlags || {};
    const needsReview = flags.needsReview || data.needsReview || false;

    // Derive final status
    let status: AnalysisStatus;
    if (isFailed || hasError) {
        status = 'failed';
    } else if (isCompleted) {
        // Check if needs review based on zero calories
        const calories = data.totalCalories ?? data.calories ?? 0;
        if (calories === 0 || needsReview) {
            status = 'needs_review';
        } else {
            status = 'completed';
        }
    } else {
        status = 'processing';
    }

    return {
        dishName: data.dishName || data.name || null,
        imageUrl: data.imageUrl || data.imageUri || data.mediaUrl || data.coverUrl || null,
        calories: data.totalCalories ?? data.calories ?? null,
        protein: data.totalProtein ?? data.protein ?? null,
        carbs: data.totalCarbs ?? data.carbs ?? null,
        fat: data.totalFat ?? data.fat ?? null,
        healthScore: data.healthScore?.score ?? data.healthInsights?.score ?? null,
        ingredients: data.ingredients || data.components || data.items || [],
        errorMessage: data.error || data.errorMessage || null,
        status,
    };
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    const [pendingAnalyses, setPendingAnalyses] = useState<Map<string, PendingAnalysis>>(new Map());
    const [isPolling, setIsPolling] = useState(false);
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
            }
        };
    }, []);

    /**
     * Add a new pending analysis
     */
    const addPendingAnalysis = useCallback((analysisId: string, localPreviewUri?: string) => {
        const newAnalysis: PendingAnalysis = {
            id: analysisId,
            analysisId,
            status: 'processing',
            localPreviewUri,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            pollAttempts: 0,
        };

        setPendingAnalyses(prev => {
            const next = new Map(prev);
            next.set(analysisId, newAnalysis);
            return next;
        });

        // Start polling if not already
        startPolling();
    }, []);

    /**
     * Update an existing analysis
     */
    const updateAnalysis = useCallback((analysisId: string, updates: Partial<PendingAnalysis>) => {
        setPendingAnalyses(prev => {
            const existing = prev.get(analysisId);
            if (!existing) return prev;

            const next = new Map(prev);
            next.set(analysisId, {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
            });
            return next;
        });
    }, []);

    /**
     * Remove a pending analysis
     */
    const removePendingAnalysis = useCallback((analysisId: string) => {
        setPendingAnalyses(prev => {
            const next = new Map(prev);
            next.delete(analysisId);
            return next;
        });
    }, []);

    /**
     * Get analysis by ID
     */
    const getAnalysisById = useCallback((analysisId: string) => {
        return pendingAnalyses.get(analysisId);
    }, [pendingAnalyses]);

    /**
     * Poll for analysis updates
     */
    const pollAnalyses = useCallback(async () => {
        if (!isMountedRef.current) return;

        const processingAnalyses = Array.from(pendingAnalyses.values()).filter(
            a => a.status === 'processing'
        );

        if (processingAnalyses.length === 0) {
            setIsPolling(false);
            return;
        }

        setIsPolling(true);

        for (const analysis of processingAnalyses) {
            if (!isMountedRef.current) break;

            try {
                // Increment poll attempts
                const newAttempts = analysis.pollAttempts + 1;

                if (newAttempts > MAX_POLL_ATTEMPTS) {
                    // Max attempts reached - mark as needs_review
                    updateAnalysis(analysis.analysisId, {
                        status: 'needs_review',
                        errorMessage: 'Analysis is taking longer than expected. Please try again.',
                        pollAttempts: newAttempts,
                    });
                    continue;
                }

                // Fetch latest status
                const result = await ApiService.getAnalysisStatus(analysis.analysisId);

                if (!isMountedRef.current) break;

                // Extract and apply updates
                const updates = extractAnalysisData(result);

                // For terminal statuses, remove from pending immediately
                // User can still view full results by tapping the saved meal card
                if (['completed', 'failed', 'needs_review'].includes(updates.status || '')) {
                    // Remove immediately - no delay needed
                    removePendingAnalysis(analysis.analysisId);
                } else {
                    // Only update if still processing
                    updateAnalysis(analysis.analysisId, {
                        ...updates,
                        pollAttempts: newAttempts,
                    });
                }

            } catch (error: any) {
                console.error(`[AnalysisContext] Poll error for ${analysis.analysisId}:`, error);

                // Don't mark as failed immediately on network errors
                if (error.isNetworkError || error.isServerError) {
                    updateAnalysis(analysis.analysisId, {
                        pollAttempts: analysis.pollAttempts + 1,
                    });
                } else {
                    updateAnalysis(analysis.analysisId, {
                        status: 'failed',
                        errorMessage: error.message || 'Failed to get analysis status',
                        pollAttempts: analysis.pollAttempts + 1,
                    });
                }
            }
        }

        // Schedule next poll with backoff
        if (isMountedRef.current) {
            const stillProcessing = Array.from(pendingAnalyses.values()).some(
                a => a.status === 'processing'
            );

            if (stillProcessing) {
                const backoffInterval = Math.min(
                    POLL_INTERVAL_MS * Math.pow(POLL_BACKOFF_MULTIPLIER, processingAnalyses[0]?.pollAttempts || 0),
                    10000 // Max 10 seconds
                );
                pollTimerRef.current = setTimeout(pollAnalyses, backoffInterval);
            } else {
                setIsPolling(false);
            }
        }
    }, [pendingAnalyses, updateAnalysis]);

    /**
     * Start polling if needed
     */
    const startPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
        }
        // Start polling after a short delay
        pollTimerRef.current = setTimeout(pollAnalyses, POLL_INTERVAL_MS);
    }, [pollAnalyses]);

    /**
     * Retry a failed analysis
     */
    const retryAnalysis = useCallback(async (analysisId: string) => {
        const analysis = pendingAnalyses.get(analysisId);
        if (!analysis) return;

        // Reset to processing
        updateAnalysis(analysisId, {
            status: 'processing',
            errorMessage: null,
            pollAttempts: 0,
            updatedAt: Date.now(),
        });

        // Start polling
        startPolling();
    }, [pendingAnalyses, updateAnalysis, startPolling]);

    // Effect to check for processing analyses and start polling
    useEffect(() => {
        const hasProcessing = Array.from(pendingAnalyses.values()).some(
            a => a.status === 'processing'
        );

        if (hasProcessing && !isPolling) {
            startPolling();
        }
    }, [pendingAnalyses, isPolling, startPolling]);

    const value: AnalysisContextType = {
        pendingAnalyses,
        addPendingAnalysis,
        updateAnalysis,
        removePendingAnalysis,
        retryAnalysis,
        getAnalysisById,
        isPolling,
    };

    return (
        <AnalysisContext.Provider value={value}>
            {children}
        </AnalysisContext.Provider>
    );
}

/**
 * Hook to use analysis context
 */
export function useAnalysis() {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
}

/**
 * Hook to get pending analyses as array (for rendering)
 */
export function usePendingAnalyses() {
    const { pendingAnalyses } = useAnalysis();
    return Array.from(pendingAnalyses.values()).sort(
        (a, b) => b.startedAt - a.startedAt
    );
}
