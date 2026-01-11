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
    addPendingAnalysis: (_analysisId: string, _localPreviewUri?: string) => void;
    updateAnalysis: (_analysisId: string, _updates: Partial<PendingAnalysis>) => void;
    removePendingAnalysis: (_analysisId: string) => void;
    retryAnalysis: (_analysisId: string) => Promise<void>;
    getAnalysisById: (_analysisId: string) => PendingAnalysis | undefined;
    isPolling: boolean;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 3000;
const POLL_BACKOFF_MULTIPLIER = 1.2;

// deriveStatus removed

/**
 * Extract analysis data from API response
 * PHASE 1/3: Enhanced error handling for Vision errors and parse failures
 */
function extractAnalysisData(apiResponse: any): Partial<PendingAnalysis> {
    if (!apiResponse) return {};

    // Check explicit API status first - this determines if polling should stop
    const apiStatus = (apiResponse?.status || '').toUpperCase();
    const isCompleted = apiStatus === 'COMPLETED' || apiStatus === 'SUCCESS';
    const isFailed = apiStatus === 'FAILED' || apiStatus === 'ERROR';
    const isNeedsReview = apiStatus === 'NEEDS_REVIEW';

    const data = apiResponse.data || apiResponse;

    // PHASE 1: Check for explicit error including new analysisError field
    const analysisError = data.analysisError;
    const hasError = !!(data.error || data.errorMessage || analysisError);

    // Get flags from API response
    const flags = data.analysisFlags || {};
    const needsReview = flags.needsReview || data.needsReview || false;

    // Derive final status based on API status and error presence
    let status: AnalysisStatus;
    if (isFailed || (hasError && analysisError?.status === 'api_error')) {
        status = 'failed';
    } else if (isNeedsReview || (hasError && analysisError?.status === 'no_food_detected')) {
        status = 'needs_review';
    } else if (isCompleted) {
        // Check if needs review based on zero calories (all items failed nutrition lookup)
        const calories = data.totalCalories ?? data.calories ?? data.total?.calories ?? 0;
        const hasItems = (data.items?.length ?? data.ingredients?.length ?? 0) > 0;
        if ((calories === 0 && hasItems) || needsReview) {
            status = 'needs_review';
        } else {
            status = 'completed';
        }
    } else {
        status = 'processing';
    }

    // Build error message from various sources
    let errorMessage = null;
    if (analysisError?.message) {
        errorMessage = analysisError.message;
    } else if (data.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message;
    } else if (data.errorMessage) {
        errorMessage = data.errorMessage;
    }

    return {
        // STEP 2 FIX: Prioritize displayName from backend, NOT first ingredient
        // Priority: displayName > dishNameLocalized > originalDishName > dishName > name
        dishName: data.displayName || data.dishNameLocalized || data.dishName || data.originalDishName || data.name || null,
        imageUrl: data.imageUrl || data.imageUri || data.mediaUrl || data.coverUrl || null,
        calories: data.totalCalories ?? data.calories ?? data.total?.calories ?? null,
        protein: data.totalProtein ?? data.protein ?? data.total?.protein ?? null,
        carbs: data.totalCarbs ?? data.carbs ?? data.total?.carbs ?? null,
        fat: data.totalFat ?? data.fat ?? data.total?.fat ?? null,
        healthScore: data.healthScore?.total ?? data.healthScore?.score ?? data.healthInsights?.score ?? null,
        ingredients: data.ingredients || data.components || data.items || [],
        errorMessage,
        status,
    };
}

// STEP 5: Minimum interval between poll cycles to prevent spam
const MIN_POLL_INTERVAL_MS = 2000;

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    const [pendingAnalyses, setPendingAnalyses] = useState<Map<string, PendingAnalysis>>(new Map());
    const [isPolling, setIsPolling] = useState(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollRecursionRef = useRef<() => (void | Promise<void>) | undefined>(undefined); // Ref to hold the poll function for safe recursion
    const isMountedRef = useRef(true);
    // Ref to keep track of latest pending analyses for polling without stale closures
    const pendingAnalysesRef = useRef(pendingAnalyses);
    // STEP 5: Track last poll time to prevent duplicate polls
    const lastPollTimeRef = useRef<number>(0);
    const isPollingInProgressRef = useRef<boolean>(false);

    // Sync ref with state
    useEffect(() => {
        pendingAnalysesRef.current = pendingAnalyses;
    }, [pendingAnalyses]);

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
        console.log(`[AnalysisContext] removePendingAnalysis called for ${analysisId}`);
        setPendingAnalyses(prev => {
            if (!prev.has(analysisId)) return prev; // Optimization
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
     * STEP 5: Added debounce guard to prevent duplicate polls
     */
    const pollAnalyses = useCallback(async () => {
        if (!isMountedRef.current) return;

        // STEP 5: Debounce guard - prevent polling if too soon or already in progress
        const now = Date.now();
        if (now - lastPollTimeRef.current < MIN_POLL_INTERVAL_MS) {
            console.log('[AnalysisContext] Poll skipped - too soon since last poll');
            return;
        }
        if (isPollingInProgressRef.current) {
            console.log('[AnalysisContext] Poll skipped - already in progress');
            return;
        }

        // Use Ref to get latest state, avoiding stale closures in setTimeout
        const currentPendingMap = pendingAnalysesRef.current;
        const processingAnalyses = Array.from(currentPendingMap.values()).filter(
            a => a.status === 'processing'
        );

        if (processingAnalyses.length === 0) {
            console.log('[AnalysisContext] No processing analyses, stopping poll.');
            setIsPolling(false);
            return;
        }

        // STEP 5: Mark polling in progress
        lastPollTimeRef.current = now;
        isPollingInProgressRef.current = true;
        setIsPolling(true);

        for (const analysis of processingAnalyses) {
            if (!isMountedRef.current) break;

            // Double check if it's still in the map (it might have been removed while we were waiting)
            if (!pendingAnalysesRef.current.has(analysis.analysisId)) {
                continue;
            }

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
                console.log(`[AnalysisContext] Polling status for ${analysis.analysisId}...`);
                const result = await ApiService.getAnalysisStatus(analysis.analysisId);
                console.log(`[AnalysisContext] Got status for ${analysis.analysisId}:`, result?.status);

                if (!isMountedRef.current) break;

                // Extract and apply updates
                const updates = extractAnalysisData(result);
                console.log(`[AnalysisContext] Applying updates for ${analysis.analysisId}:`, updates.status);

                // For terminal statuses, fetch full result then remove from pending
                if (['completed', 'failed', 'needs_review'].includes(updates.status || '')) {
                    console.log(`[AnalysisContext] Terminal status for ${analysis.analysisId}, fetching full result...`);

                    // STAGE 1 FIX: Fetch full result before removing
                    // This ensures UI gets proper dishNameLocalized and all data
                    try {
                        const fullResult = await ApiService.getAnalysisResult(analysis.analysisId);
                        if (fullResult?.data) {
                            const fullUpdates = extractAnalysisData(fullResult);
                            // Update with complete data including dishNameLocalized
                            updateAnalysis(analysis.analysisId, {
                                ...fullUpdates,
                                status: updates.status,
                            });
                            console.log(`[AnalysisContext] Full result fetched, dishName: "${fullUpdates.dishName}"`);
                        }
                    } catch (err: any) {
                        console.error(`[AnalysisContext] Failed to fetch full result:`, err?.message);
                        // Still update with status data even if result fetch fails
                        updateAnalysis(analysis.analysisId, updates);
                    }

                    // Remove from pending after update
                    console.log(`[AnalysisContext] Removing terminal analysis ${analysis.analysisId}`);
                    removePendingAnalysis(analysis.analysisId);
                } else {
                    // Only update if still processing
                    console.log(`[AnalysisContext] Updating processing analysis ${analysis.analysisId}`);
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

        // STEP 5: Mark polling as no longer in progress
        isPollingInProgressRef.current = false;

        // Schedule next poll with backoff
        if (isMountedRef.current) {
            // Check Ref again for latest status
            const currentMapAfterPoll = pendingAnalysesRef.current;
            const stillProcessing = Array.from(currentMapAfterPoll.values()).some(
                a => a.status === 'processing'
            );

            if (stillProcessing) {
                const backoffInterval = Math.min(
                    POLL_INTERVAL_MS * Math.pow(POLL_BACKOFF_MULTIPLIER, processingAnalyses[0]?.pollAttempts || 0),
                    10000 // Max 10 seconds
                );
                // Use ref for recursion to avoid processing before definition
                if (pollRecursionRef.current) {
                    pollTimerRef.current = setTimeout(pollRecursionRef.current, backoffInterval);
                }
            } else {
                setIsPolling(false);
            }
        }
    }, [updateAnalysis, removePendingAnalysis]);

    // Update recursion ref whenever pollAnalyses changes
    useEffect(() => {
        pollRecursionRef.current = pollAnalyses;
    }, [pollAnalyses]);

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
    }, [startPolling]);

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
    }, [pendingAnalyses, updateAnalysis, startPolling]); // Keep pendingAnalyses here as it's just reading once

    // Effect to check for processing analyses and start polling
    useEffect(() => {
        const hasProcessing = Array.from(pendingAnalyses.values()).some(
            a => a.status === 'processing'
        );

        if (hasProcessing && !isPolling) {
            startPolling();
        }
    }, [pendingAnalyses, isPolling, startPolling]);

    const value = React.useMemo<AnalysisContextType>(() => ({
        pendingAnalyses,
        addPendingAnalysis,
        updateAnalysis,
        removePendingAnalysis,
        retryAnalysis,
        getAnalysisById,
        isPolling,
    }), [
        pendingAnalyses,
        addPendingAnalysis,
        updateAnalysis,
        removePendingAnalysis,
        retryAnalysis,
        getAnalysisById,
        isPolling,
    ]);

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
    return React.useMemo(() => Array.from(pendingAnalyses.values()).sort(
        (a, b) => b.startedAt - a.startedAt
    ), [pendingAnalyses]);
}
