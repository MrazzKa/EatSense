/**
 * Provider Resilience Utilities
 * STEP 2: Retry with exponential backoff and jitter
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
    shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelayMs: 300,
    maxDelayMs: 5000,
    jitterMs: 100,
    shouldRetry: (error: any) => {
        // Retry on timeout, network errors, 5xx
        const code = error?.code;
        const status = error?.response?.status;
        return (
            code === 'ETIMEDOUT' ||
            code === 'ECONNABORTED' ||
            code === 'ECONNRESET' ||
            code === 'ENOTFOUND' ||
            (status && status >= 500 && status < 600)
        );
    },
};

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            if (attempt >= opts.maxRetries || !opts.shouldRetry(error)) {
                throw error;
            }

            // Exponential backoff with jitter
            const delay = Math.min(
                opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * opts.jitterMs,
                opts.maxDelayMs,
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Simple Circuit Breaker
 */
export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private isOpen = false;

    constructor(
        private readonly threshold = 5,
        private readonly resetTimeMs = 60000,
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit should reset
        if (this.isOpen && Date.now() - this.lastFailureTime >= this.resetTimeMs) {
            this.reset();
        }

        if (this.isOpen) {
            throw new Error('Circuit breaker is open');
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private recordSuccess(): void {
        this.failures = 0;
        this.isOpen = false;
    }

    private recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.isOpen = true;
        }
    }

    private reset(): void {
        this.failures = 0;
        this.isOpen = false;
    }

    get status() {
        return {
            isOpen: this.isOpen,
            failures: this.failures,
            lastFailure: this.lastFailureTime,
        };
    }
}
