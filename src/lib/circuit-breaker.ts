// Enhanced Circuit Breaker Implementation
export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  halfOpenMaxCalls: number
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failures: number
  lastFailureTime: number
  nextAttemptTime: number
  successCount: number
  totalRequests: number
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig
  private state: CircuitBreakerState
  private readonly name: string

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      recoveryTimeout: config.recoveryTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 300000, // 5 minutes
      halfOpenMaxCalls: config.halfOpenMaxCalls || 3
    }
    
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0,
      totalRequests: 0
    }
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker ${this.name} is OPEN`)
    }

    this.state.totalRequests++

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  public canExecute(): boolean {
    const now = Date.now()

    switch (this.state.state) {
      case 'CLOSED':
        return true
      
      case 'OPEN':
        if (now >= this.state.nextAttemptTime) {
          this.state.state = 'HALF_OPEN'
          this.state.successCount = 0
          return true
        }
        return false
      
      case 'HALF_OPEN':
        return this.state.successCount < this.config.halfOpenMaxCalls
      
      default:
        return false
    }
  }

  public onSuccess(): void {
    this.state.failures = 0
    
    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++
      if (this.state.successCount >= this.config.halfOpenMaxCalls) {
        this.state.state = 'CLOSED'
        console.log(`✅ Circuit breaker ${this.name} is now CLOSED`)
      }
    }
  }

  public onFailure(): void {
    this.state.failures++
    this.state.lastFailureTime = Date.now()

    if (this.state.state === 'HALF_OPEN') {
      this.state.state = 'OPEN'
      this.state.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      console.log(`❌ Circuit breaker ${this.name} is now OPEN (from HALF_OPEN)`)
    } else if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'OPEN'
      this.state.nextAttemptTime = Date.now() + this.config.recoveryTimeout
      console.log(`❌ Circuit breaker ${this.name} is now OPEN`)
    }
  }

  public getState(): CircuitBreakerState {
    return { ...this.state }
  }

  public getHealthMetrics() {
    const successRate = this.state.totalRequests > 0 
      ? ((this.state.totalRequests - this.state.failures) / this.state.totalRequests) * 100 
      : 100

    return {
      name: this.name,
      state: this.state.state,
      successRate: Math.round(successRate * 100) / 100,
      totalRequests: this.state.totalRequests,
      failures: this.state.failures,
      lastFailureTime: this.state.lastFailureTime,
      nextAttemptTime: this.state.nextAttemptTime
    }
  }

  public reset(): void {
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0,
      totalRequests: 0
    }
    console.log(`🔄 Circuit breaker ${this.name} has been reset`)
  }
}

// Circuit Breaker Manager for multiple services
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager
  private breakers: Map<string, CircuitBreaker> = new Map()

  private constructor() {}

  public static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager()
    }
    return CircuitBreakerManager.instance
  }

  public getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config))
    }
    return this.breakers.get(name)!
  }

  public getAllHealthMetrics() {
    const metrics: any[] = []
    this.breakers.forEach(breaker => {
      metrics.push(breaker.getHealthMetrics())
    })
    return metrics
  }

  public resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset())
  }
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance()
