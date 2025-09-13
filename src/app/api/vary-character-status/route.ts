import { NextRequest, NextResponse } from 'next/server';

// Circuit breaker state (shared with main API)
let circuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  successCount: 0
};

// API statistics (shared with main API)
let apiStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastResetTime: Date.now()
};

export async function GET(request: NextRequest) {
  const now = Date.now();
  const successRate = apiStats.totalRequests > 0 
    ? ((apiStats.successfulRequests / apiStats.totalRequests) * 100).toFixed(1)
    : '0.0';
  
  const timeSinceLastFailure = circuitBreakerState.lastFailureTime > 0 
    ? Math.round((now - circuitBreakerState.lastFailureTime) / 1000)
    : null;
  
  const status = {
    api: 'vary-character',
    status: circuitBreakerState.isOpen ? 'rate_limited' : 'healthy',
    circuitBreaker: {
      isOpen: circuitBreakerState.isOpen,
      failureCount: circuitBreakerState.failureCount,
      successCount: circuitBreakerState.successCount,
      timeSinceLastFailure: timeSinceLastFailure
    },
    statistics: {
      totalRequests: apiStats.totalRequests,
      successfulRequests: apiStats.successfulRequests,
      failedRequests: apiStats.failedRequests,
      successRate: `${successRate}%`,
      lastReset: new Date(apiStats.lastResetTime).toISOString()
    },
    recommendations: circuitBreakerState.isOpen ? [
      'Wait 10 minutes before making new requests',
      'Consider using text-only mode to avoid image generation rate limits',
      'Check if GOOGLE_API_KEY has sufficient quota'
    ] : [
      'API is healthy and ready for requests',
      'Monitor success rate for any issues'
    ]
  };
  
  return NextResponse.json(status);
}
