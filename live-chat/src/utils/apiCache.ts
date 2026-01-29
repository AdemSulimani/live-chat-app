// Simple in-memory cache for API responses
interface CacheEntry {
    data: any;
    timestamp: number;
    expiresIn: number; // milliseconds
}

class APICache {
    private cache: Map<string, CacheEntry> = new Map();
    private defaultExpiresIn = 5 * 60 * 1000; // 5 minutes default

    // Get cached data if it exists and hasn't expired
    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now - entry.timestamp > entry.expiresIn) {
            // Cache expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    // Set cache entry
    set(key: string, data: any, expiresIn?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresIn: expiresIn || this.defaultExpiresIn,
        });
    }

    // Remove specific cache entry
    delete(key: string): void {
        this.cache.delete(key);
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
    }

    // Clear expired entries
    clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.expiresIn) {
                this.cache.delete(key);
            }
        }
    }
}

// Export singleton instance
export const apiCache = new APICache();

// Helper function to create cache key
export const createCacheKey = (endpoint: string, params?: Record<string, any>): string => {
    if (params) {
        const paramString = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        return `${endpoint}?${paramString}`;
    }
    return endpoint;
};

