// Cache Manager for vARY Ai - Optimized caching strategies
export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items
  cleanupInterval: number // Cleanup interval in milliseconds
}

export interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

export class CacheManager<T> {
  public cache: Map<string, CacheItem<T>> = new Map()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: config.ttl || 300000, // 5 minutes default
      maxSize: config.maxSize || 1000,
      cleanupInterval: config.cleanupInterval || 60000 // 1 minute
    }
    
    this.startCleanupTimer()
  }

  public set(key: string, value: T, customTtl?: number): void {
    const now = Date.now()
    const ttl = customTtl || this.config.ttl

    // If cache is full, remove least recently used item
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    })
  }

  public get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const now = Date.now()
    
    // Check if item has expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    item.accessCount++
    item.lastAccessed = now
    
    return item.value
  }

  public has(key: string): boolean {
    return this.get(key) !== null
  }

  public delete(key: string): boolean {
    return this.cache.delete(key)
  }

  public clear(): void {
    this.cache.clear()
  }

  public size(): number {
    return this.cache.size
  }

  public getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalAccesses: number
    averageAccessCount: number
  } {
    let totalAccesses = 0
    let totalAccessCount = 0
    
    for (const item of this.cache.values()) {
      totalAccesses += item.accessCount
      totalAccessCount++
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalAccessCount > 0 ? totalAccesses / totalAccessCount : 0,
      totalAccesses,
      averageAccessCount: totalAccessCount > 0 ? totalAccesses / totalAccessCount : 0
    }
  }

  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired items`)
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cache.clear()
  }
}

// Specialized cache managers for different data types
export class UserCacheManager extends CacheManager<any> {
  constructor() {
    super({
      ttl: 600000, // 10 minutes
      maxSize: 500,
      cleanupInterval: 120000 // 2 minutes
    })
  }

  public getUser(userId: string): any | null {
    return this.get(`user:${userId}`)
  }

  public setUser(userId: string, userData: any): void {
    this.set(`user:${userId}`, userData)
  }

  public getUserCredits(userId: string): number | null {
    return this.get(`credits:${userId}`)
  }

  public setUserCredits(userId: string, credits: number): void {
    this.set(`credits:${userId}`, credits, 300000) // 5 minutes TTL for credits
  }
}

export class ModelCacheManager extends CacheManager<any> {
  constructor() {
    super({
      ttl: 1800000, // 30 minutes
      maxSize: 100,
      cleanupInterval: 300000 // 5 minutes
    })
  }

  public getModelHealth(modelName: string): any | null {
    return this.get(`model:${modelName}`)
  }

  public setModelHealth(modelName: string, healthData: any): void {
    this.set(`model:${modelName}`, healthData)
  }

  public getModelCost(modelName: string): number | null {
    return this.get(`cost:${modelName}`)
  }

  public setModelCost(modelName: string, cost: number): void {
    this.set(`cost:${modelName}`, cost, 3600000) // 1 hour TTL for costs
  }
}

export class GalleryCacheManager extends CacheManager<any[]> {
  constructor() {
    super({
      ttl: 900000, // 15 minutes
      maxSize: 200,
      cleanupInterval: 300000 // 5 minutes
    })
  }

  public getUserGallery(userId: string, limit: number = 50, offset: number = 0): any[] | null {
    return this.get(`gallery:${userId}:${limit}:${offset}`)
  }

  public setUserGallery(userId: string, gallery: any[], limit: number = 50, offset: number = 0): void {
    this.set(`gallery:${userId}:${limit}:${offset}`, gallery)
  }

  public invalidateUserGallery(userId: string): void {
    // Remove all gallery entries for this user
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(`gallery:${userId}:`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.delete(key))
  }
}

// Global cache manager instance
export const userCache = new UserCacheManager()
export const modelCache = new ModelCacheManager()
export const galleryCache = new GalleryCacheManager()

// Cache warming functions
export async function warmUserCache(userId: string, userData: any): Promise<void> {
  userCache.setUser(userId, userData)
  if (userData.credit_balance !== undefined) {
    userCache.setUserCredits(userId, userData.credit_balance)
  }
}

export async function warmModelCache(): Promise<void> {
  const modelCosts = {
    'nano-banana': 1,
    'runway-t2i': 2,
    'veo3-fast': 3,
    'minimax-2.0': 2,
    'kling-2.1-master': 3,
    'runway-video': 4,
    'seedream-3': 2,
    'seedream-4': 3,
    'flux-dev': 1,
    'luma-photon-reframe': 2,
    'gemini-25-flash-image-edit': 1
  }

  for (const [modelName, cost] of Object.entries(modelCosts)) {
    modelCache.setModelCost(modelName, cost)
  }
}

// Cache statistics endpoint
export function getCacheStatistics() {
  return {
    userCache: userCache.getStats(),
    modelCache: modelCache.getStats(),
    galleryCache: galleryCache.getStats(),
    timestamp: new Date().toISOString()
  }
}

// Cleanup all caches
export function cleanupAllCaches(): void {
  userCache.clear()
  modelCache.clear()
  galleryCache.clear()
  console.log('🧹 All caches cleared')
}
