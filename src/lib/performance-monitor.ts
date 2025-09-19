// Performance Monitoring and Metrics Collection
export interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  startTime: number
  endTime: number
  duration: number
  statusCode: number
  userAgent?: string
  ip?: string
  userId?: string
  memoryUsage?: NodeJS.MemoryUsage
  error?: string
  metadata?: Record<string, any>
}

export interface SystemMetrics {
  timestamp: string
  memory: NodeJS.MemoryUsage
  uptime: number
  activeRequests: number
  totalRequests: number
  errorRate: number
  averageResponseTime: number
  cacheHitRate: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private activeRequests = 0
  private totalRequests = 0
  private totalErrors = 0
  private totalResponseTime = 0
  private readonly maxMetrics = 1000

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start monitoring a request
  public startRequest(
    requestId: string,
    endpoint: string,
    method: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics {
    const metric: PerformanceMetrics = {
      requestId,
      endpoint,
      method,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      statusCode: 0,
      memoryUsage: process.memoryUsage(),
      metadata
    }

    this.activeRequests++
    this.totalRequests++

    return metric
  }

  // End monitoring a request
  public endRequest(
    metric: PerformanceMetrics,
    statusCode: number,
    error?: string
  ): void {
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.statusCode = statusCode
    metric.error = error

    this.activeRequests--
    this.totalResponseTime += metric.duration

    if (statusCode >= 400) {
      this.totalErrors++
    }

    // Store metric
    this.metrics.push(metric)

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow requests
    if (metric.duration > 5000) { // 5 seconds
      console.warn(`🐌 Slow request detected: ${metric.endpoint} took ${metric.duration}ms`)
    }
  }

  // Get current system metrics
  public getSystemMetrics(): SystemMetrics {
    const now = Date.now()
    const errorRate = this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0
    const averageResponseTime = this.totalRequests > 0 ? this.totalResponseTime / this.totalRequests : 0

    return {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      activeRequests: this.activeRequests,
      totalRequests: this.totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      cacheHitRate: 0 // Will be calculated by cache manager
    }
  }

  // Get performance statistics
  public getPerformanceStats(): {
    totalRequests: number
    activeRequests: number
    errorRate: number
    averageResponseTime: number
    slowestEndpoints: Array<{ endpoint: string; avgDuration: number; count: number }>
    errorEndpoints: Array<{ endpoint: string; errorCount: number; errorRate: number }>
  } {
    const endpointStats = new Map<string, { totalDuration: number; count: number; errors: number }>()

    // Calculate endpoint statistics
    for (const metric of this.metrics) {
      const existing = endpointStats.get(metric.endpoint) || { totalDuration: 0, count: 0, errors: 0 }
      existing.totalDuration += metric.duration
      existing.count++
      if (metric.statusCode >= 400) {
        existing.errors++
      }
      endpointStats.set(metric.endpoint, existing)
    }

    // Get slowest endpoints
    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: Math.round(stats.totalDuration / stats.count),
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)

    // Get endpoints with most errors
    const errorEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        errorCount: stats.errors,
        errorRate: Math.round((stats.errors / stats.count) * 100)
      }))
      .filter(item => item.errorCount > 0)
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10)

    return {
      totalRequests: this.totalRequests,
      activeRequests: this.activeRequests,
      errorRate: this.totalRequests > 0 ? Math.round((this.totalErrors / this.totalRequests) * 10000) / 100 : 0,
      averageResponseTime: this.totalRequests > 0 ? Math.round(this.totalResponseTime / this.totalRequests) : 0,
      slowestEndpoints,
      errorEndpoints
    }
  }

  // Get recent metrics
  public getRecentMetrics(minutes: number = 5): PerformanceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return this.metrics.filter(metric => metric.startTime >= cutoff)
  }

  // Clear old metrics
  public clearOldMetrics(hours: number = 24): void {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    this.metrics = this.metrics.filter(metric => metric.startTime >= cutoff)
  }

  // Reset all metrics
  public reset(): void {
    this.metrics = []
    this.activeRequests = 0
    this.totalRequests = 0
    this.totalErrors = 0
    this.totalResponseTime = 0
  }
}

// Middleware for automatic performance monitoring
export function withPerformanceMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  endpoint: string
) {
  return async (...args: T): Promise<Response> => {
    const monitor = PerformanceMonitor.getInstance()
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const metric = monitor.startRequest(requestId, endpoint, 'POST')
    
    try {
      const response = await handler(...args)
      monitor.endRequest(metric, response.status)
      return response
    } catch (error) {
      monitor.endRequest(metric, 500, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private memoryHistory: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = []
  private readonly maxHistory = 100

  private constructor() {}

  public static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  public recordMemoryUsage(): void {
    const usage = process.memoryUsage()
    this.memoryHistory.push({
      timestamp: Date.now(),
      usage
    })

    if (this.memoryHistory.length > this.maxHistory) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistory)
    }

    // Check for memory leaks
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10)
      const oldest = recent[0].usage.heapUsed
      const newest = recent[9].usage.heapUsed
      
      if (newest > oldest * 1.5) { // 50% increase
        console.warn(`🚨 Potential memory leak detected: heap usage increased from ${oldest} to ${newest}`)
      }
    }
  }

  public getMemoryStats(): {
    current: NodeJS.MemoryUsage
    average: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
    trend: 'increasing' | 'decreasing' | 'stable'
  } {
    const current = process.memoryUsage()
    
    if (this.memoryHistory.length === 0) {
      return {
        current,
        average: current,
        peak: current,
        trend: 'stable'
      }
    }

    // Calculate average
    const total = this.memoryHistory.reduce((acc, entry) => ({
      rss: acc.rss + entry.usage.rss,
      heapTotal: acc.heapTotal + entry.usage.heapTotal,
      heapUsed: acc.heapUsed + entry.usage.heapUsed,
      external: acc.external + entry.usage.external,
      arrayBuffers: acc.arrayBuffers + entry.usage.arrayBuffers
    }), { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 })

    const count = this.memoryHistory.length
    const average: NodeJS.MemoryUsage = {
      rss: Math.round(total.rss / count),
      heapTotal: Math.round(total.heapTotal / count),
      heapUsed: Math.round(total.heapUsed / count),
      external: Math.round(total.external / count),
      arrayBuffers: Math.round(total.arrayBuffers / count)
    }

    // Find peak
    const peak = this.memoryHistory.reduce((max, entry) => ({
      rss: Math.max(max.rss, entry.usage.rss),
      heapTotal: Math.max(max.heapTotal, entry.usage.heapTotal),
      heapUsed: Math.max(max.heapUsed, entry.usage.heapUsed),
      external: Math.max(max.external, entry.usage.external),
      arrayBuffers: Math.max(max.arrayBuffers, entry.usage.arrayBuffers)
    }), { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 })

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (this.memoryHistory.length >= 5) {
      const recent = this.memoryHistory.slice(-5)
      const oldest = recent[0].usage.heapUsed
      const newest = recent[4].usage.heapUsed
      const change = (newest - oldest) / oldest
      
      if (change > 0.1) trend = 'increasing'
      else if (change < -0.1) trend = 'decreasing'
    }

    return { current, average, peak, trend }
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance()
export const memoryMonitor = MemoryMonitor.getInstance()

// Start memory monitoring
setInterval(() => {
  memoryMonitor.recordMemoryUsage()
}, 30000) // Every 30 seconds
