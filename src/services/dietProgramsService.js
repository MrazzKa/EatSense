import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './apiService';

/**
 * DietProgramsService - Service for diet program operations
 * Features:
 * - In-memory cache with AsyncStorage persistence
 * - Progressive loading (first 5, then all)
 * - Stale-while-revalidate pattern
 */

// Cache configuration
const DIETS_CACHE_KEY = 'diets_cache_v1';
const DIETS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for persistent cache

// In-memory cache
let dietsCache = null;
let dietsCacheTime = 0;
let persistentCacheLoaded = false;

class DietProgramsService {
    constructor() {
        // Load persistent cache on service init
        this.loadPersistentCache();
    }

    /**
     * Load cache from AsyncStorage
     */
    async loadPersistentCache() {
        if (persistentCacheLoaded) return;

        try {
            const cached = await AsyncStorage.getItem(DIETS_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                const age = Date.now() - parsed.time;

                // Only use if not expired (24 hours)
                if (age < DIETS_CACHE_TTL) {
                    dietsCache = parsed.data;
                    dietsCacheTime = parsed.time;
                    console.log('[DietProgramsService] Loaded from persistent cache');
                }
            }
            persistentCacheLoaded = true;
        } catch (e) {
            console.warn('[DietProgramsService] Failed to load persistent cache:', e);
            persistentCacheLoaded = true;
        }
    }

    /**
     * Save cache to AsyncStorage
     */
    async savePersistentCache() {
        if (!dietsCache) return;

        try {
            await AsyncStorage.setItem(DIETS_CACHE_KEY, JSON.stringify({
                data: dietsCache,
                time: dietsCacheTime,
            }));
            console.log('[DietProgramsService] Saved to persistent cache');
        } catch (e) {
            console.warn('[DietProgramsService] Failed to save persistent cache:', e);
        }
    }

    /**
     * Get first N programs quickly for immediate display
     * @param {number} limit - Number of programs to fetch
     */
    async getInitialPrograms(limit = 5) {
        // First check memory cache
        if (dietsCache) {
            const diets = dietsCache?.diets || dietsCache;
            if (Array.isArray(diets) && diets.length > 0) {
                console.log('[DietProgramsService] Returning initial from cache');
                return { diets: diets.slice(0, limit), fromCache: true };
            }
        }

        // Then check persistent cache
        await this.loadPersistentCache();
        if (dietsCache) {
            const diets = dietsCache?.diets || dietsCache;
            if (Array.isArray(diets) && diets.length > 0) {
                console.log('[DietProgramsService] Returning initial from persistent cache');
                return { diets: diets.slice(0, limit), fromCache: true };
            }
        }

        // Fallback to API with limit
        const result = await ApiService.getDiets({ limit });
        return { ...(result || {}), fromCache: false };
    }

    /**
     * Get all programs with caching
     * @param {Object} filters - Optional filters (category, search, etc.)
     */
    async getPrograms(filters = {}) {
        const now = Date.now();
        const isDefaultFilter = !filters.category && !filters.search && !filters.type && !filters.limit;

        // Ensure persistent cache is loaded
        await this.loadPersistentCache();

        // Return from cache if valid and default filter
        if (isDefaultFilter && dietsCache && (now - dietsCacheTime) < DIETS_CACHE_TTL) {
            console.log('[DietProgramsService] Returning cached programs');
            return dietsCache;
        }

        const result = await ApiService.getDiets(filters);

        // Cache only default list (no filters)
        if (isDefaultFilter && result) {
            dietsCache = result;
            dietsCacheTime = now;
            console.log('[DietProgramsService] Programs cached in memory');

            // Save to persistent storage (non-blocking)
            this.savePersistentCache();
        }

        return result;
    }

    /**
     * Get cached programs immediately (for stale-while-revalidate)
     */
    getCachedPrograms() {
        return dietsCache;
    }

    /**
     * Check if cache exists (memory or persistent)
     */
    async hasCachedPrograms() {
        if (dietsCache) return true;
        await this.loadPersistentCache();
        return !!dietsCache;
    }

    /**
     * Invalidate the cache
     */
    async invalidateCache() {
        dietsCache = null;
        dietsCacheTime = 0;
        try {
            await AsyncStorage.removeItem(DIETS_CACHE_KEY);
        } catch (e) {
            // Ignore
        }
        console.log('[DietProgramsService] Cache invalidated');
    }

    async getProgram(id) {
        return ApiService.getDiet(id);
    }

    async startProgram(programId) {
        await this.invalidateCache();
        return ApiService.startDiet(programId);
    }

    async getProgress(_programId) {
        return ApiService.getActiveDiet();
    }

    async completeDay(_programId, dayNumber) {
        return ApiService.request('/diets/active/checklist', {
            method: 'PATCH',
            body: JSON.stringify({ dayNumber }),
        });
    }

    async stopProgram(_programId) {
        await this.invalidateCache();
        return ApiService.abandonDiet();
    }

    async pauseProgram() {
        return ApiService.pauseDiet();
    }

    async resumeProgram() {
        return ApiService.resumeDiet();
    }
}

export default new DietProgramsService();
